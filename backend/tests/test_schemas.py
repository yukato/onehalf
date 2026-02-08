"""
Tests for app.models.schemas module.
"""

import pytest
from pydantic import ValidationError

from backend.app.models.schemas import (
    ChatRequest,
    ConversationMessage,
    CreateRuleRequest,
    FAQChatResponse,
    FAQSource,
    LoginRequest,
    TokenResponse,
    UpdateRuleRequest,
)


class TestLoginRequest:
    def test_valid(self):
        req = LoginRequest(username="admin", password="pass123")
        assert req.username == "admin"
        assert req.password == "pass123"


class TestTokenResponse:
    def test_default_token_type(self):
        resp = TokenResponse(access_token="abc123")
        assert resp.token_type == "bearer"


class TestChatRequest:
    def test_valid_minimal(self):
        req = ChatRequest(query="Hello")
        assert req.query == "Hello"
        assert req.top_k == 3
        assert req.category is None
        assert req.conversation_history == []

    def test_valid_full(self):
        req = ChatRequest(
            query="テスト質問",
            top_k=5,
            category="男性会員の方",
            conversation_history=[
                ConversationMessage(role="user", content="こんにちは"),
                ConversationMessage(role="assistant", content="こんにちは！"),
            ],
        )
        assert req.top_k == 5
        assert len(req.conversation_history) == 2

    def test_query_min_length(self):
        with pytest.raises(ValidationError):
            ChatRequest(query="")

    def test_top_k_bounds(self):
        with pytest.raises(ValidationError):
            ChatRequest(query="test", top_k=0)
        with pytest.raises(ValidationError):
            ChatRequest(query="test", top_k=11)


class TestFAQChatResponse:
    def test_minimal(self):
        resp = FAQChatResponse(
            answer="回答です",
            sources=[FAQSource(title="記事1", url="https://example.com", score=0.95)],
        )
        assert resp.answer == "回答です"
        assert len(resp.sources) == 1
        assert resp.referenced_macros == []
        assert resp.similar_tickets == []


class TestCreateRuleRequest:
    def test_valid(self):
        req = CreateRuleRequest(title="テストルール", content="ルール内容")
        assert req.enabled is True
        assert req.target_gender is None

    def test_title_max_length(self):
        with pytest.raises(ValidationError):
            CreateRuleRequest(title="x" * 201, content="content")


class TestUpdateRuleRequest:
    def test_all_optional(self):
        req = UpdateRuleRequest()
        assert req.title is None
        assert req.content is None
        assert req.enabled is None
        assert req.order is None
