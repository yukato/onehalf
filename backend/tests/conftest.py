"""
Shared test fixtures for backend tests.
"""

import pytest
from backend.app.config import Settings


@pytest.fixture
def test_settings() -> Settings:
    """Create a Settings instance with test-safe defaults."""
    return Settings(
        basic_auth_user="testuser",
        basic_auth_password="testpass",
        auth_username="testadmin",
        auth_password="testpassword",
        jwt_secret="test-jwt-secret-key",
        jwt_access_token_expire_minutes=15,
        jwt_refresh_token_expire_days=7,
        anthropic_api_key="",
        openai_api_key="",
        bugsnag_api_key="",
        sentry_dsn="",
        data_base_path="../data",
        cors_origins="http://localhost:3100",
    )
