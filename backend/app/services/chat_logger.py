"""
Chat Logger Service - S3への書き込みとAthenaでのクエリを提供
ローカル開発時はコンソールログのみ、S3バケットが設定されている場合はS3に書き込み
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import TypedDict
from uuid import uuid4
from zoneinfo import ZoneInfo

from ..config import Settings

logger = logging.getLogger(__name__)


class QualityAssessmentDict(TypedDict, total=False):
    """品質評価のスキーマ"""
    confidence_score: float       # 0.0-1.0 回答の確信度
    information_completeness: str # complete | partial | insufficient
    suggested_improvement: str | None  # 改善が必要な場合の提案
    missing_topics: list[str]     # 不足している情報のトピック


class ChatLog(TypedDict, total=False):
    """チャットログのスキーマ"""
    session_id: str          # 会話セッションID
    message_id: str          # 個別メッセージID
    timestamp: str           # ISO format (UTC)
    endpoint: str            # /api/faq/chat など
    log_type: str            # faq, internal
    category: str | None     # FAQのカテゴリ（男性会員の方/女性会員の方）
    username: str | None     # 操作ユーザー名（基本認証）
    query: str               # ユーザー入力
    answer: str | None       # AIの回答（オプション）
    duration_ms: int | None  # 応答時間
    sources_count: int       # 参照ソース数
    # 管理者ユーザー情報（オプション）
    admin_user_id: str | None      # 管理者ユーザーID
    admin_username: str | None     # 管理者ユーザー名
    # 品質評価フィールド（新規追加）
    quality_assessment: QualityAssessmentDict | None  # AIによる自己評価


class LoginLog(TypedDict, total=False):
    """ログインログのスキーマ"""
    event_id: str            # イベントID
    timestamp: str           # ISO format (UTC)
    event_type: str          # login, logout, refresh, login_failed
    username: str            # ユーザー名（基本認証）
    ip_address: str          # IPアドレス
    user_agent: str          # User-Agent
    success: bool            # 成功/失敗
    # 管理者ユーザー情報（オプション）
    admin_user_id: str | None      # 管理者ユーザーID
    admin_username: str | None     # 管理者ユーザー名
    # 位置情報（IPジオロケーション）
    country: str | None      # 国
    country_code: str | None # 国コード
    region: str | None       # 地域/都道府県
    city: str | None         # 市区町村
    isp: str | None          # ISP


class ChatLogger:
    """S3へのログ書き込みとAthenaでのクエリを提供するサービス"""

    VALID_LOG_TYPES = {"faq", "internal"}

    def __init__(self, settings: Settings):
        self.settings = settings
        self.bucket = settings.chat_logs_bucket
        self.prefix = settings.chat_logs_prefix
        self.athena_database = settings.athena_database
        self.athena_workgroup = settings.athena_workgroup
        self.athena_output_bucket = settings.athena_output_bucket or settings.chat_logs_bucket

        # boto3クライアントはS3が有効な場合のみ初期化
        self.s3_client = None
        self.athena_client = None

        if self._is_enabled():
            try:
                import boto3
                # ローカル環境でのAWS認証情報設定
                session_kwargs = {
                    'region_name': settings.aws_region,
                }
                # プロファイルが指定されている場合はプロファイルを使用
                if settings.environment == 'local' and settings.aws_profile:
                    session_kwargs['profile_name'] = settings.aws_profile
                # Access Key が設定されている場合は直接認証情報を使用
                elif settings.aws_access_key_id and settings.aws_secret_access_key:
                    session_kwargs['aws_access_key_id'] = settings.aws_access_key_id
                    session_kwargs['aws_secret_access_key'] = settings.aws_secret_access_key

                session = boto3.Session(**session_kwargs)
                self.s3_client = session.client('s3')
                self.athena_client = session.client('athena')
                logger.info(f"Chat logger initialized with S3 bucket: {self.bucket}")
            except ImportError:
                logger.warning("boto3 not installed, S3 logging disabled")
            except Exception as e:
                logger.warning(f"Failed to initialize AWS clients: {e}")

    def _is_enabled(self) -> bool:
        """S3ログが有効かどうかを確認"""
        return bool(self.bucket)

    async def log(self, log_data: ChatLog) -> None:
        """S3にログを非同期で書き込み（無効な場合はコンソールログのみ）"""
        # 常にログを記録
        logger.info(f"USER_INPUT: {json.dumps(log_data, ensure_ascii=False)}")

        if not self._is_enabled() or not self.s3_client:
            return

        try:
            await asyncio.to_thread(self._write_log_sync, log_data)
        except Exception as e:
            # ログ書き込み失敗はエラーログに記録するが、メイン処理は止めない
            logger.error(f"Failed to write chat log to S3: {e}")

    def _build_s3_key(self, prefix: str, timestamp_iso: str) -> str:
        """Build Hive-partitioned S3 key from timestamp."""
        now = datetime.fromisoformat(timestamp_iso)
        timestamp_ms = int(now.timestamp() * 1000)
        unique_id = uuid4().hex[:8]
        filename = f"{timestamp_ms}-{unique_id}.jsonl"
        return (
            f"{prefix}/year={now.strftime('%Y')}/month={now.strftime('%m')}/"
            f"day={now.strftime('%d')}/hour={now.strftime('%H')}/{filename}"
        )

    def _put_jsonl(self, key: str, log_data: dict) -> None:
        """Write a single JSONL record to S3."""
        body = json.dumps(log_data, ensure_ascii=False) + "\n"
        self.s3_client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=body.encode('utf-8'),
            ContentType='application/json',
        )
        logger.debug(f"Wrote log to s3://{self.bucket}/{key}")

    def _write_log_sync(self, log_data: ChatLog) -> None:
        """同期的にS3にログを書き込み（asyncio.to_threadから呼ばれる）"""
        key = self._build_s3_key(self.prefix, log_data["timestamp"])
        self._put_jsonl(key, log_data)

    async def query_logs(
        self,
        days: int = 7,
        hours: int | None = None,
        log_type: str | None = None,
        limit: int = 100,
    ) -> list[dict]:
        """Athenaでログをクエリ"""
        if not self._is_enabled() or not self.athena_client:
            return []

        try:
            return await asyncio.to_thread(
                self._query_logs_sync,
                days,
                hours,
                log_type,
                limit,
            )
        except Exception as e:
            logger.error(f"Failed to query chat logs from Athena: {e}")
            raise

    @staticmethod
    def _build_partition_clause(start_time: datetime, end_time: datetime) -> str:
        """Build Hive partition filter clause for date range."""
        parts = []
        current = start_time
        while current <= end_time:
            parts.append(
                f"(year = '{current.strftime('%Y')}' AND month = '{current.strftime('%m')}' AND day = '{current.strftime('%d')}')"
            )
            current += timedelta(days=1)
        return " OR ".join(parts)

    def _execute_with_admin_fallback(
        self,
        query_with_admin: str,
        query_without_admin: str,
        result_parser: callable,
    ) -> list[dict]:
        """Execute Athena query, falling back if admin columns are missing."""
        output_location = f"s3://{self.athena_output_bucket}/athena-results/"
        exec_kwargs = {
            'QueryExecutionContext': {'Database': self.athena_database},
            'ResultConfiguration': {'OutputLocation': output_location},
            'WorkGroup': self.athena_workgroup,
        }

        try:
            response = self.athena_client.start_query_execution(
                QueryString=query_with_admin, **exec_kwargs
            )
            query_execution_id = response['QueryExecutionId']
            self._wait_for_query(query_execution_id)
            return result_parser(query_execution_id)
        except Exception as e:
            if 'COLUMN_NOT_FOUND' not in str(e):
                raise
            logger.info("admin columns not found, falling back to query without them")
            response = self.athena_client.start_query_execution(
                QueryString=query_without_admin, **exec_kwargs
            )
            query_execution_id = response['QueryExecutionId']
            self._wait_for_query(query_execution_id)
            return result_parser(query_execution_id)

    def _query_logs_sync(
        self,
        days: int,
        hours: int | None,
        log_type: str | None,
        limit: int,
    ) -> list[dict]:
        """同期的にAthenaでログをクエリ"""
        if log_type and log_type not in self.VALID_LOG_TYPES:
            raise ValueError(f"Invalid log_type: {log_type}")

        now = datetime.now(self.settings.tz)
        start_time = now - timedelta(hours=hours) if hours else now - timedelta(days=days)

        partition_clause = self._build_partition_clause(start_time, now)

        where_clauses = [f"({partition_clause})", f"timestamp >= '{start_time.isoformat()}'"]
        if log_type:
            where_clauses.append(f"log_type = '{log_type}'")
        where_clause = " AND ".join(where_clauses)

        columns = (
            "session_id, message_id, timestamp, endpoint, log_type, category, "
            "username, {admin}, query, answer, duration_ms, sources_count, quality_assessment"
        )
        tail = f"FROM {self.athena_database}.chat_logs\nWHERE {where_clause}\nORDER BY timestamp DESC\nLIMIT {limit}"

        query_with = f"SELECT {columns.format(admin='admin_user_id, admin_username')}\n{tail}"
        query_without = f"SELECT {columns.format(admin='NULL as admin_user_id, NULL as admin_username')}\n{tail}"

        return self._execute_with_admin_fallback(query_with, query_without, self._get_query_results)

    def _wait_for_query(self, query_execution_id: str, max_wait_seconds: int = 60) -> None:
        """Athenaクエリの完了を待機"""
        start = time.time()
        while time.time() - start < max_wait_seconds:
            response = self.athena_client.get_query_execution(
                QueryExecutionId=query_execution_id
            )
            state = response['QueryExecution']['Status']['State']

            if state == 'SUCCEEDED':
                return
            elif state in ('FAILED', 'CANCELLED'):
                reason = response['QueryExecution']['Status'].get('StateChangeReason', 'Unknown')
                raise Exception(f"Athena query {state}: {reason}")

            time.sleep(0.5)

        raise Exception(f"Athena query timed out after {max_wait_seconds} seconds")

    def _get_query_results(self, query_execution_id: str) -> list[dict]:
        """Athenaクエリ結果を取得"""
        results = []
        paginator = self.athena_client.get_paginator('get_query_results')

        for page in paginator.paginate(QueryExecutionId=query_execution_id):
            rows = page['ResultSet']['Rows']

            # 最初の行はヘッダー
            if not results and rows:
                headers = [col['VarCharValue'] for col in rows[0]['Data']]
                rows = rows[1:]  # ヘッダー行をスキップ
            else:
                headers = ['session_id', 'message_id', 'timestamp', 'endpoint',
                          'log_type', 'category', 'username', 'admin_user_id',
                          'admin_username', 'query', 'answer', 'duration_ms',
                          'sources_count', 'quality_assessment']

            for row in rows:
                values = [col.get('VarCharValue', '') for col in row['Data']]
                record = dict(zip(headers, values))

                # 型変換
                if record.get('duration_ms'):
                    record['duration_ms'] = int(record['duration_ms'])
                if record.get('sources_count'):
                    record['sources_count'] = int(record['sources_count'])
                # quality_assessmentをJSONとしてパース
                if record.get('quality_assessment'):
                    try:
                        record['quality_assessment'] = json.loads(record['quality_assessment'])
                    except (json.JSONDecodeError, TypeError):
                        record['quality_assessment'] = None

                results.append(record)

        return results

    async def repair_partitions(self) -> None:
        """Athenaパーティションを修復（新しいパーティションを検出）"""
        if not self._is_enabled() or not self.athena_client:
            return

        query = f"MSCK REPAIR TABLE {self.athena_database}.chat_logs"
        output_location = f"s3://{self.athena_output_bucket}/athena-results/"

        response = self.athena_client.start_query_execution(
            QueryString=query,
            QueryExecutionContext={
                'Database': self.athena_database,
            },
            ResultConfiguration={
                'OutputLocation': output_location,
            },
            WorkGroup=self.athena_workgroup,
        )

        query_execution_id = response['QueryExecutionId']
        await asyncio.to_thread(self._wait_for_query, query_execution_id)
        logger.info("Athena partitions repaired successfully")

    # ==================== ログイン履歴関連 ====================

    async def log_login(
        self,
        username: str,
        endpoint: str,
        ip_address: str = "",
        user_agent: str = "",
        success: bool = True,
        event_type: str = "login",
        admin_user_id: str | None = None,
        admin_username: str | None = None,
    ) -> None:
        """S3にログインログを非同期で書き込み"""
        log_data: LoginLog = {
            "event_id": uuid4().hex,
            "timestamp": datetime.now(self.settings.tz).isoformat(),
            "event_type": event_type,
            "username": username,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "success": success,
        }

        # 管理者情報が指定されている場合のみ追加
        if admin_user_id:
            log_data["admin_user_id"] = admin_user_id
        if admin_username:
            log_data["admin_username"] = admin_username

        # 常にログを記録
        logger.info(f"LOGIN_EVENT: {json.dumps(log_data, ensure_ascii=False)}")

        if not self._is_enabled() or not self.s3_client:
            return

        try:
            await asyncio.to_thread(self._write_login_log_sync, log_data)
        except Exception as e:
            logger.error(f"Failed to write login log to S3: {e}")

    def _write_login_log_sync(self, log_data: LoginLog) -> None:
        """同期的にS3にログインログを書き込み"""
        key = self._build_s3_key("login-logs", log_data["timestamp"])
        self._put_jsonl(key, log_data)

    async def query_login_logs(
        self,
        days: int = 7,
        limit: int = 100,
    ) -> list[dict]:
        """Athenaでログインログをクエリ"""
        if not self._is_enabled() or not self.athena_client:
            return []

        try:
            return await asyncio.to_thread(
                self._query_login_logs_sync,
                days,
                limit,
            )
        except Exception as e:
            logger.error(f"Failed to query login logs from Athena: {e}")
            raise

    def _query_login_logs_sync(
        self,
        days: int,
        limit: int,
    ) -> list[dict]:
        """同期的にAthenaでログインログをクエリ"""
        now = datetime.now(self.settings.tz)
        start_time = now - timedelta(days=days)

        partition_clause = self._build_partition_clause(start_time, now)
        where = f"({partition_clause})\n  AND timestamp >= '{start_time.isoformat()}'"

        columns = (
            "event_id, timestamp, event_type, username, ip_address, user_agent, "
            "success, {admin}, country, country_code, region, city, isp"
        )
        tail = f"FROM {self.athena_database}.login_logs\nWHERE {where}\nORDER BY timestamp DESC\nLIMIT {limit}"

        query_with = f"SELECT {columns.format(admin='admin_user_id, admin_username')}\n{tail}"
        query_without = f"SELECT {columns.format(admin='NULL as admin_user_id, NULL as admin_username')}\n{tail}"

        return self._execute_with_admin_fallback(query_with, query_without, self._get_login_query_results)

    def _get_login_query_results(self, query_execution_id: str) -> list[dict]:
        """Athenaログインクエリ結果を取得"""
        results = []
        paginator = self.athena_client.get_paginator('get_query_results')

        for page in paginator.paginate(QueryExecutionId=query_execution_id):
            rows = page['ResultSet']['Rows']

            if not results and rows:
                headers = [col['VarCharValue'] for col in rows[0]['Data']]
                rows = rows[1:]
            else:
                headers = ['event_id', 'timestamp', 'event_type', 'username',
                          'ip_address', 'user_agent', 'success', 'admin_user_id',
                          'admin_username', 'country', 'country_code', 'region', 'city', 'isp']

            for row in rows:
                values = [col.get('VarCharValue', '') for col in row['Data']]
                record = dict(zip(headers, values))

                # 型変換
                if record.get('success'):
                    record['success'] = record['success'].lower() == 'true'

                # 空文字をNoneに変換
                for key in ['admin_user_id', 'admin_username', 'country', 'country_code', 'region', 'city', 'isp']:
                    if record.get(key) == '':
                        record[key] = None

                results.append(record)

        return results


# シングルトンインスタンス用のキャッシュ
_chat_logger_instance: ChatLogger | None = None


def get_chat_logger(settings: Settings) -> ChatLogger:
    """ChatLoggerのシングルトンインスタンスを取得"""
    global _chat_logger_instance
    if _chat_logger_instance is None:
        _chat_logger_instance = ChatLogger(settings)
    return _chat_logger_instance
