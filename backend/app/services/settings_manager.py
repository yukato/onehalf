"""
Settings Manager - Manages LLM model settings stored in data/settings.json
"""

import json
from pathlib import Path
from typing import Optional
from pydantic import BaseModel

from .llm_client import AVAILABLE_MODELS, create_llm_client, LLMClient


class LLMSettings(BaseModel):
    """LLM settings model"""
    provider: str = "anthropic"
    model: str = "claude-sonnet-4-5-20250929"


class SettingsManager:
    """Singleton manager for application settings"""

    _instance: Optional["SettingsManager"] = None
    _settings_path: Path
    _settings: LLMSettings
    _anthropic_api_key: str
    _openai_api_key: str
    _api_key_valid: dict[str, bool]  # Cache for API key validation results

    def __new__(cls, data_base_path: str, anthropic_api_key: str = "", openai_api_key: str = ""):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, data_base_path: str, anthropic_api_key: str = "", openai_api_key: str = ""):
        if self._initialized:
            return

        self._settings_path = Path(data_base_path) / "settings.json"
        self._anthropic_api_key = anthropic_api_key
        self._openai_api_key = openai_api_key
        self._api_key_valid = {}  # Will be populated on first check
        self._settings = self._load_settings()
        self._initialized = True

    def _load_settings(self) -> LLMSettings:
        """Load settings from file or create default"""
        if self._settings_path.exists():
            try:
                with open(self._settings_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return LLMSettings(**data)
            except (json.JSONDecodeError, ValueError) as e:
                print(f"Warning: Failed to load settings, using defaults: {e}")

        # Default settings - use Anthropic if available, otherwise OpenAI
        if self._anthropic_api_key:
            return LLMSettings(provider="anthropic", model="claude-sonnet-4-5-20250929")
        elif self._openai_api_key:
            return LLMSettings(provider="openai", model="gpt-4o")
        else:
            return LLMSettings()

    def _save_settings(self) -> None:
        """Save current settings to file"""
        self._settings_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self._settings_path, "w", encoding="utf-8") as f:
            json.dump(self._settings.model_dump(), f, indent=2)

    def get_settings(self) -> LLMSettings:
        """Get current LLM settings"""
        return self._settings

    def update_settings(self, provider: str, model: str) -> LLMSettings:
        """Update LLM settings"""
        # Validate the model is available
        available = self.get_available_models()
        model_info = next(
            (m for m in available if m["provider"] == provider and m["model"] == model and m["enabled"]),
            None
        )
        if not model_info:
            raise ValueError(f"Model {provider}/{model} is not available")

        self._settings = LLMSettings(provider=provider, model=model)
        self._save_settings()
        return self._settings

    def _validate_api_key(self, provider: str) -> bool:
        """Validate an API key by making a minimal test request"""
        # Return cached result if available
        if provider in self._api_key_valid:
            return self._api_key_valid[provider]

        if provider == "anthropic":
            if not self._anthropic_api_key:
                self._api_key_valid[provider] = False
                return False
            try:
                import anthropic
                client = anthropic.Anthropic(api_key=self._anthropic_api_key)
                # Make a minimal request to validate the key
                client.messages.create(
                    model="claude-3-5-haiku-20241022",
                    max_tokens=1,
                    messages=[{"role": "user", "content": "hi"}]
                )
                self._api_key_valid[provider] = True
                print(f"[SettingsManager] Anthropic API key validated successfully")
            except Exception as e:
                print(f"[SettingsManager] Anthropic API key validation failed: {e}")
                self._api_key_valid[provider] = False

        elif provider == "openai":
            if not self._openai_api_key:
                self._api_key_valid[provider] = False
                return False
            try:
                import openai
                client = openai.OpenAI(api_key=self._openai_api_key)
                # Make a minimal request to validate the key
                client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=1,
                    messages=[{"role": "user", "content": "hi"}]
                )
                self._api_key_valid[provider] = True
                print(f"[SettingsManager] OpenAI API key validated successfully")
            except Exception as e:
                print(f"[SettingsManager] OpenAI API key validation failed: {e}")
                self._api_key_valid[provider] = False

        return self._api_key_valid.get(provider, False)

    def validate_all_api_keys(self) -> dict[str, bool]:
        """Validate all configured API keys and return results"""
        providers = set(m["provider"] for m in AVAILABLE_MODELS)
        for provider in providers:
            self._validate_api_key(provider)
        return self._api_key_valid.copy()

    def get_available_models(self) -> list[dict]:
        """Get list of available models with enabled status based on API key validity"""
        result = []
        for model_info in AVAILABLE_MODELS:
            provider = model_info["provider"]
            # Check if API key is set first
            has_key = False
            if provider == "anthropic" and self._anthropic_api_key:
                has_key = True
            elif provider == "openai" and self._openai_api_key:
                has_key = True

            # If key is set, check if it's valid (use cached result or validate)
            if has_key:
                enabled = self._validate_api_key(provider)
            else:
                enabled = False

            result.append({
                **model_info,
                "enabled": enabled,
            })
        return result

    def create_llm_client(self) -> LLMClient:
        """Create an LLM client based on current settings"""
        return create_llm_client(
            provider=self._settings.provider,
            model=self._settings.model,
            anthropic_api_key=self._anthropic_api_key,
            openai_api_key=self._openai_api_key,
        )

    def has_any_api_key(self) -> bool:
        """Check if at least one API key is configured"""
        return bool(self._anthropic_api_key or self._openai_api_key)


# Global instance holder
_settings_manager: Optional[SettingsManager] = None


def get_settings_manager() -> SettingsManager:
    """Get the global settings manager instance"""
    if _settings_manager is None:
        raise RuntimeError("SettingsManager not initialized. Call init_settings_manager first.")
    return _settings_manager


def init_settings_manager(data_base_path: str, anthropic_api_key: str = "", openai_api_key: str = "") -> SettingsManager:
    """Initialize the global settings manager"""
    global _settings_manager
    _settings_manager = SettingsManager(data_base_path, anthropic_api_key, openai_api_key)
    return _settings_manager
