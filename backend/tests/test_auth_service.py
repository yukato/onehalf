"""
Tests for app.services.auth_service module.
"""

import pytest
from backend.app.services.auth_service import AuthService
from backend.app.config import Settings


@pytest.fixture
def auth_service(test_settings: Settings) -> AuthService:
    return AuthService(test_settings)


class TestAuthService:
    """Tests for AuthService."""

    def test_verify_credentials_valid(self, auth_service: AuthService):
        assert auth_service.verify_credentials("testadmin", "testpassword") is True

    def test_verify_credentials_wrong_username(self, auth_service: AuthService):
        assert auth_service.verify_credentials("wrong", "testpassword") is False

    def test_verify_credentials_wrong_password(self, auth_service: AuthService):
        assert auth_service.verify_credentials("testadmin", "wrong") is False

    def test_create_access_token(self, auth_service: AuthService):
        token = auth_service.create_access_token("testadmin")
        assert isinstance(token, str)
        assert len(token) > 0

    def test_create_refresh_token(self, auth_service: AuthService):
        token = auth_service.create_refresh_token("testadmin")
        assert isinstance(token, str)
        assert len(token) > 0

    def test_verify_access_token(self, auth_service: AuthService):
        token = auth_service.create_access_token("testadmin")
        username = auth_service.verify_token(token, "access")
        assert username == "testadmin"

    def test_verify_refresh_token(self, auth_service: AuthService):
        token = auth_service.create_refresh_token("testadmin")
        username = auth_service.verify_token(token, "refresh")
        assert username == "testadmin"

    def test_verify_token_wrong_type(self, auth_service: AuthService):
        token = auth_service.create_access_token("testadmin")
        username = auth_service.verify_token(token, "refresh")
        assert username is None

    def test_verify_token_invalid(self, auth_service: AuthService):
        username = auth_service.verify_token("invalid.token.here", "access")
        assert username is None

    def test_get_refresh_token_max_age(self, auth_service: AuthService):
        max_age = auth_service.get_refresh_token_max_age()
        assert max_age == 7 * 24 * 60 * 60  # 7 days in seconds
