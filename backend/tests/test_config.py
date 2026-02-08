"""
Tests for app.config module.
"""

from backend.app.config import Settings, get_settings


class TestSettings:
    """Tests for the Settings configuration class."""

    def test_default_values(self):
        settings = Settings()
        assert settings.basic_auth_user == "admin"
        assert settings.jwt_access_token_expire_minutes == 15
        assert settings.jwt_refresh_token_expire_days == 7
        assert settings.embedding_model == "intfloat/multilingual-e5-small"
        assert settings.environment == "local"

    def test_data_path_methods(self):
        settings = Settings(data_base_path="/tmp/testdata")
        assert settings.get_articles_path() == "/tmp/testdata/articles/all_articles.json"
        assert settings.get_article_embeddings_path() == "/tmp/testdata/embeddings/article_embeddings.npy"
        assert settings.get_tickets_path() == "/tmp/testdata/tickets/solved_tickets.json"
        assert settings.get_ticket_embeddings_path() == "/tmp/testdata/tickets/ticket_embeddings.npy"
        assert settings.get_faq_macros_path() == "/tmp/testdata/macros/faq_macros.json"
        assert settings.get_faq_macro_embeddings_path() == "/tmp/testdata/macros/faq_macro_embeddings.npy"
        assert settings.get_internal_macros_path() == "/tmp/testdata/macros/internal_macros.json"
        assert settings.get_internal_macro_embeddings_path() == "/tmp/testdata/macros/internal_macro_embeddings.npy"

    def test_macros_backward_compat(self):
        settings = Settings(data_base_path="/tmp/testdata")
        assert settings.get_macros_path() == settings.get_internal_macros_path()
        assert settings.get_macro_embeddings_path() == settings.get_internal_macro_embeddings_path()

    def test_custom_values(self):
        settings = Settings(
            jwt_secret="my-secret",
            cors_origins="http://localhost:3000,http://localhost:4000",
            environment="production",
        )
        assert settings.jwt_secret == "my-secret"
        assert "localhost:3000" in settings.cors_origins
        assert settings.environment == "production"

    def test_get_settings_returns_settings(self):
        get_settings.cache_clear()
        result = get_settings()
        assert isinstance(result, Settings)
