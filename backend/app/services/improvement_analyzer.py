"""
Improvement Analyzer Service - Analyzes chat logs to generate article improvement suggestions
S3バケットが設定されていればS3に保存、なければローカルファイル（開発用）
"""

import json
import logging
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Optional

from ..config import Settings
from ..models.schemas import ImprovementSuggestion, ArticleDraft
from .chat_logger import get_chat_logger
from .llm_client import LLMClient
from .settings_manager import get_settings_manager

logger = logging.getLogger(__name__)

# Quality thresholds for log analysis
LOW_QUALITY_CONFIDENCE_THRESHOLD = 0.6
ACTION_CREATE_NEW_THRESHOLD = 0.3
ACTION_UPDATE_EXISTING_THRESHOLD = 0.5
ANALYSIS_LOG_LIMIT = 500
MAX_HISTORY_ENTRIES = 1000


class ImprovementAnalyzer:
    """Singleton service for analyzing chat logs and generating improvement suggestions"""

    _instance: Optional["ImprovementAnalyzer"] = None
    _lock = Lock()

    def __new__(cls, settings: Settings):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self, settings: Settings):
        if self._initialized:
            return

        self.settings = settings
        self.data_base_path = settings.data_base_path
        self.local_file_path = Path(self.data_base_path) / "improvement_suggestions.json"
        self.s3_bucket = settings.chat_logs_bucket
        self.s3_key = "config/improvement_suggestions.json"

        # S3クライアント初期化
        self.s3_client = None
        if self._is_s3_enabled():
            try:
                import boto3
                profile = settings.aws_profile if settings.environment == 'local' and settings.aws_profile else None
                session = boto3.Session(
                    region_name=settings.aws_region,
                    profile_name=profile
                )
                self.s3_client = session.client('s3')
                logger.info(f"Improvement analyzer initialized with S3: s3://{self.s3_bucket}/{self.s3_key}")
            except ImportError:
                logger.warning("boto3 not installed, falling back to local file storage")
            except Exception as e:
                logger.warning(f"Failed to initialize S3 client: {e}, falling back to local file storage")

        self._data: dict = {"suggestions": [], "drafts": []}
        self._load_data()
        self._initialized = True

    def _is_s3_enabled(self) -> bool:
        """S3ストレージが有効かどうかを確認"""
        return bool(self.s3_bucket)

    def _load_data(self) -> None:
        """Load suggestions from S3 or local file"""
        if self._is_s3_enabled() and self.s3_client:
            try:
                response = self.s3_client.get_object(Bucket=self.s3_bucket, Key=self.s3_key)
                content = response['Body'].read().decode('utf-8')
                self._data = json.loads(content)
                logger.info(f"Loaded suggestions from S3: s3://{self.s3_bucket}/{self.s3_key}")
                return
            except self.s3_client.exceptions.NoSuchKey:
                logger.info(f"No suggestions file found in S3, will create on first save")
            except Exception as e:
                logger.warning(f"Failed to load suggestions from S3: {e}, trying local file")

        # Fallback to local file
        if self.local_file_path.exists():
            try:
                with open(self.local_file_path, "r", encoding="utf-8") as f:
                    self._data = json.load(f)
                logger.info(f"Loaded suggestions from local file: {self.local_file_path}")
            except (json.JSONDecodeError, IOError) as e:
                logger.error(f"Error loading local suggestions file: {e}")
                self._data = {"suggestions": [], "drafts": []}
        else:
            logger.info("No suggestions file found, starting with empty data")
            self._data = {"suggestions": [], "drafts": []}

    def _save_data(self) -> None:
        """Save suggestions to S3 or local file"""
        data_json = json.dumps(self._data, ensure_ascii=False, indent=2, default=str)

        if self._is_s3_enabled() and self.s3_client:
            try:
                self.s3_client.put_object(
                    Bucket=self.s3_bucket,
                    Key=self.s3_key,
                    Body=data_json.encode('utf-8'),
                    ContentType='application/json',
                )
                logger.info(f"Saved suggestions to S3: s3://{self.s3_bucket}/{self.s3_key}")
                return
            except Exception as e:
                logger.error(f"Failed to save suggestions to S3: {e}, falling back to local file")

        # Fallback to local file
        try:
            self.local_file_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.local_file_path, "w", encoding="utf-8") as f:
                f.write(data_json)
            logger.info(f"Saved suggestions to local file: {self.local_file_path}")
        except IOError as e:
            logger.error(f"Failed to save suggestions to local file: {e}")

    @staticmethod
    def _to_suggestion(s: dict) -> ImprovementSuggestion:
        """Convert a suggestion dict to an ImprovementSuggestion model"""
        created_at = s["created_at"]
        return ImprovementSuggestion(
            id=s["id"],
            topic=s["topic"],
            occurrence_count=s["occurrence_count"],
            sample_questions=s["sample_questions"],
            avg_confidence=s["avg_confidence"],
            suggested_action=s["suggested_action"],
            related_faq_ids=s.get("related_faq_ids", []),
            created_at=datetime.fromisoformat(created_at) if isinstance(created_at, str) else created_at,
            status=s["status"],
        )

    @staticmethod
    def _to_draft(d: dict) -> ArticleDraft:
        """Convert a draft dict to an ArticleDraft model"""
        generated_at = d["generated_at"]
        return ArticleDraft(
            id=d["id"],
            suggestion_id=d["suggestion_id"],
            title=d["title"],
            content=d["content"],
            source_questions=d["source_questions"],
            generated_at=datetime.fromisoformat(generated_at) if isinstance(generated_at, str) else generated_at,
        )

    def _get_llm_client(self) -> LLMClient:
        """Get the current LLM client from settings manager"""
        return get_settings_manager().create_llm_client()

    async def analyze_logs(
        self,
        days: int = 7,
        min_occurrences: int = 3,
    ) -> list[ImprovementSuggestion]:
        """Analyze recent chat logs and generate improvement suggestions"""
        chat_logger = get_chat_logger(self.settings)

        # 直近のログを取得
        logs = await chat_logger.query_logs(days=days, log_type="faq", limit=ANALYSIS_LOG_LIMIT)

        if not logs:
            logger.info("No chat logs found for analysis")
            return []

        # 品質評価が低いログをフィルタリング
        low_quality_logs = []
        for log in logs:
            qa = log.get("quality_assessment")
            if qa:
                confidence = qa.get("confidence_score", 1.0)
                completeness = qa.get("information_completeness", "complete")
                if confidence < LOW_QUALITY_CONFIDENCE_THRESHOLD or completeness in ("partial", "insufficient"):
                    low_quality_logs.append({
                        "query": log.get("query", ""),
                        "answer": log.get("answer", ""),
                        "confidence": confidence,
                        "completeness": completeness,
                        "missing_topics": qa.get("missing_topics", []),
                        "suggested_improvement": qa.get("suggested_improvement"),
                    })

        if not low_quality_logs:
            logger.info("No low-quality responses found")
            return []

        logger.info(f"Found {len(low_quality_logs)} low-quality responses for analysis")

        # missing_topicsでグルーピング
        topic_groups: dict[str, list[dict]] = defaultdict(list)
        for log in low_quality_logs:
            for topic in log.get("missing_topics", []):
                if topic:
                    topic_groups[topic].append(log)
            # missing_topicsが空の場合はsuggested_improvementをトピックとして使用
            if not log.get("missing_topics") and log.get("suggested_improvement"):
                topic_groups[log["suggested_improvement"][:50]].append(log)

        # 出現回数でフィルタリング
        suggestions = []
        now = datetime.now(timezone.utc)

        for topic, topic_logs in topic_groups.items():
            if len(topic_logs) >= min_occurrences:
                # 平均確信度を計算
                avg_confidence = sum(log["confidence"] for log in topic_logs) / len(topic_logs)

                # サンプル質問を抽出（最大5件）
                sample_questions = list(set(log["query"] for log in topic_logs[:5]))

                # アクション提案を決定
                if avg_confidence < ACTION_CREATE_NEW_THRESHOLD:
                    suggested_action = "create_new"
                elif avg_confidence < ACTION_UPDATE_EXISTING_THRESHOLD:
                    suggested_action = "update_existing"
                else:
                    suggested_action = "add_examples"

                suggestion_data = {
                    "id": str(uuid.uuid4()),
                    "topic": topic,
                    "occurrence_count": len(topic_logs),
                    "sample_questions": sample_questions,
                    "avg_confidence": round(avg_confidence, 2),
                    "suggested_action": suggested_action,
                    "related_faq_ids": [],
                    "created_at": now.isoformat(),
                    "status": "pending",
                }
                suggestions.append(suggestion_data)

        # 出現回数でソート
        suggestions.sort(key=lambda x: x["occurrence_count"], reverse=True)

        # 既存の提案に追加（重複チェック）
        existing_topics = {s["topic"] for s in self._data["suggestions"]}
        for suggestion in suggestions:
            if suggestion["topic"] not in existing_topics:
                self._data["suggestions"].append(suggestion)

        self._save_data()

        return [self._to_suggestion(s) for s in suggestions]

    def get_suggestions(
        self,
        status: str | None = None,
        limit: int = 50,
    ) -> list[ImprovementSuggestion]:
        """Get improvement suggestions, optionally filtered by status"""
        suggestions = []
        for s in self._data["suggestions"]:
            if status is None or s.get("status") == status:
                suggestions.append(self._to_suggestion(s))
                if len(suggestions) >= limit:
                    break
        return suggestions

    def get_suggestion(self, suggestion_id: str) -> ImprovementSuggestion | None:
        """Get a single suggestion by ID"""
        for s in self._data["suggestions"]:
            if s["id"] == suggestion_id:
                return self._to_suggestion(s)
        return None

    def update_suggestion_status(
        self,
        suggestion_id: str,
        status: str,
    ) -> ImprovementSuggestion | None:
        """Update the status of a suggestion"""
        for s in self._data["suggestions"]:
            if s["id"] == suggestion_id:
                s["status"] = status
                self._save_data()
                return self._to_suggestion(s)
        return None

    def generate_article_draft(self, suggestion_id: str) -> ArticleDraft | None:
        """Generate an article draft for a suggestion"""
        suggestion = self.get_suggestion(suggestion_id)
        if not suggestion:
            return None

        # プロンプトを構築
        sample_qs = "\n".join(f"- {q}" for q in suggestion.sample_questions)

        prompt = f"""以下の情報に基づいて、ヘルプセンター記事の下書きをマークダウン形式で作成してください。

【改善が必要なトピック】
{suggestion.topic}

【ユーザーからの実際の質問例】
{sample_qs}

【記事作成のガイドライン】
1. タイトルは簡潔で検索しやすいものにする
2. 導入文で「この記事では〇〇について説明します」と明示
3. 手順がある場合は番号付きリストで記載
4. 注意事項や補足は「**ご注意**」セクションで記載
5. 関連するFAQへのリンクを想定した「関連記事」セクションを追加
6. ユーザーフレンドリーな敬語で記述

以下の形式で出力してください:

# [記事タイトル]

[導入文]

## [セクション1]
[内容]

## [セクション2]
[内容]

## ご注意
[注意事項]

## 関連記事
- [関連記事1のタイトル候補]
- [関連記事2のタイトル候補]
"""

        llm_client = self._get_llm_client()
        try:
            content = llm_client.generate(prompt, max_tokens=2000)

            # タイトルを抽出
            title = suggestion.topic
            lines = content.strip().split("\n")
            for line in lines:
                if line.startswith("# "):
                    title = line[2:].strip()
                    break

            draft_data = {
                "id": str(uuid.uuid4()),
                "suggestion_id": suggestion_id,
                "title": title,
                "content": content,
                "source_questions": suggestion.sample_questions,
                "generated_at": datetime.now(timezone.utc).isoformat(),
            }

            # 下書きを保存
            self._data["drafts"].append(draft_data)
            self._save_data()

            return self._to_draft(draft_data)

        except Exception as e:
            logger.error(f"Failed to generate article draft: {e}")
            return None

    def get_drafts(self, limit: int = 50) -> list[ArticleDraft]:
        """Get all article drafts"""
        return [self._to_draft(d) for d in self._data["drafts"][:limit]]

    def get_draft(self, draft_id: str) -> ArticleDraft | None:
        """Get a single draft by ID"""
        for d in self._data["drafts"]:
            if d["id"] == draft_id:
                return self._to_draft(d)
        return None


# Singleton getter
_improvement_analyzer: ImprovementAnalyzer | None = None


def get_improvement_analyzer(settings: Settings) -> ImprovementAnalyzer:
    """Get or create the singleton ImprovementAnalyzer instance"""
    global _improvement_analyzer
    if _improvement_analyzer is None:
        _improvement_analyzer = ImprovementAnalyzer(settings)
    return _improvement_analyzer
