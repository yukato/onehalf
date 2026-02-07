"""
JWT Authentication Service
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt, JWTError

from ..config import Settings


class AuthService:
    """Service for handling JWT authentication"""

    def __init__(self, settings: Settings):
        self.settings = settings

    def verify_credentials(self, username: str, password: str) -> bool:
        """Verify username and password"""
        return (
            username == self.settings.auth_username and
            password == self.settings.auth_password
        )

    def create_access_token(self, username: str) -> str:
        """Create a short-lived access token"""
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=self.settings.jwt_access_token_expire_minutes
        )
        return jwt.encode(
            {"sub": username, "exp": expire, "type": "access"},
            self.settings.jwt_secret,
            algorithm="HS256"
        )

    def create_refresh_token(self, username: str) -> str:
        """Create a long-lived refresh token"""
        expire = datetime.now(timezone.utc) + timedelta(
            days=self.settings.jwt_refresh_token_expire_days
        )
        return jwt.encode(
            {"sub": username, "exp": expire, "type": "refresh"},
            self.settings.jwt_secret,
            algorithm="HS256"
        )

    def verify_token(self, token: str, token_type: str) -> Optional[str]:
        """Verify a token and return the username if valid"""
        try:
            payload = jwt.decode(
                token,
                self.settings.jwt_secret,
                algorithms=["HS256"]
            )
            if payload.get("type") != token_type:
                return None
            return payload.get("sub")
        except JWTError:
            return None

    def get_refresh_token_max_age(self) -> int:
        """Get refresh token max age in seconds"""
        return self.settings.jwt_refresh_token_expire_days * 24 * 60 * 60
