"""
Application configuration using pydantic-settings
"""

from zoneinfo import ZoneInfo

from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Timezone
    timezone: str = "Asia/Tokyo"

    @property
    def tz(self) -> ZoneInfo:
        return ZoneInfo(self.timezone)

    # Basic認証
    basic_auth_user: str = "admin"
    basic_auth_password: str = "admin123"

    # Authentication
    auth_username: str = "bachelor"
    auth_password: str = "chatbot2026"
    jwt_secret: str = "change-this-secret-in-production"
    jwt_access_token_expire_minutes: int = 15
    jwt_refresh_token_expire_days: int = 7

    # LLM API Keys
    anthropic_api_key: str = ""
    openai_api_key: str = ""

    # Error monitoring
    bugsnag_api_key: str = ""
    sentry_dsn: str = ""

    # TimeRex API
    timerex_api_key: str = ""
    timerex_base_url: str = "https://api.timerex.net/v1"
    timerex_calendar_ids: str = ""  # Comma-separated calendar IDs

    # CORS
    cors_origins: str = "http://localhost:3100"

    # Data paths
    # Local: ../data/... (from backend/ dir), Docker: ./data/... (from /app dir)
    data_base_path: str = "../data"  # Override with DATA_BASE_PATH env var for Docker
    articles_path: str = ""  # Will be computed
    article_embeddings_path: str = ""
    tickets_path: str = ""
    ticket_embeddings_path: str = ""
    macros_path: str = ""
    macro_embeddings_path: str = ""

    # FAQ用マクロ（【チャットボット使用可】タグ付きのみ）
    faq_macros_path: str = ""
    faq_macro_embeddings_path: str = ""

    # 内部サポート用マクロ（全マクロ）
    internal_macros_path: str = ""
    internal_macro_embeddings_path: str = ""

    def get_articles_path(self) -> str:
        return f"{self.data_base_path}/articles/all_articles.json"

    def get_article_embeddings_path(self) -> str:
        return f"{self.data_base_path}/embeddings/article_embeddings.npy"

    def get_tickets_path(self) -> str:
        return f"{self.data_base_path}/tickets/solved_tickets.json"

    def get_ticket_embeddings_path(self) -> str:
        return f"{self.data_base_path}/tickets/ticket_embeddings.npy"

    def get_macros_path(self) -> str:
        """後方互換性のため残す（内部サポート用と同じ）"""
        return self.get_internal_macros_path()

    def get_macro_embeddings_path(self) -> str:
        """後方互換性のため残す（内部サポート用と同じ）"""
        return self.get_internal_macro_embeddings_path()

    def get_faq_macros_path(self) -> str:
        """FAQ用マクロ（【チャットボット使用可】タグ付きのみ）"""
        return f"{self.data_base_path}/macros/faq_macros.json"

    def get_faq_macro_embeddings_path(self) -> str:
        """FAQ用マクロのエンベディング"""
        return f"{self.data_base_path}/macros/faq_macro_embeddings.npy"

    def get_internal_macros_path(self) -> str:
        """内部サポート用マクロ（全マクロ）"""
        return f"{self.data_base_path}/macros/internal_macros.json"

    def get_internal_macro_embeddings_path(self) -> str:
        """内部サポート用マクロのエンベディング"""
        return f"{self.data_base_path}/macros/internal_macro_embeddings.npy"

    # Model
    embedding_model: str = "intfloat/multilingual-e5-small"
    claude_model: str = "claude-sonnet-4-5-20250929"

    # AWS Settings for S3/Athena logging
    aws_region: str = "ap-northeast-1"
    aws_access_key_id: str = ""  # AWS Access Key ID
    aws_secret_access_key: str = ""  # AWS Secret Access Key
    aws_profile: str = ""  # ローカル用のAWSプロファイル名（空の場合は使用しない）
    environment: str = "local"  # local or production

    # S3/Athena Chat Logging (空の場合はログを無効化)
    chat_logs_bucket: str = ""  # S3バケット名
    chat_logs_prefix: str = "chat-logs"  # S3プレフィックス
    athena_database: str = "bachelor_chatbot"  # Athenaデータベース名
    athena_workgroup: str = "primary"  # Athenaワークグループ
    athena_output_bucket: str = ""  # Athena結果出力先（空の場合はchat_logs_bucketを使用）



@lru_cache()
def get_settings() -> Settings:
    return Settings()
