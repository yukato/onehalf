"""
LLM Client abstraction layer - supports multiple LLM providers
"""

from abc import ABC, abstractmethod
from typing import Optional
import anthropic
import openai


class LLMClient(ABC):
    """Abstract base class for LLM clients"""

    @abstractmethod
    def generate(self, prompt: str, max_tokens: int = 2048) -> str:
        """Generate a response from the LLM"""
        pass

    @abstractmethod
    def generate_with_history(
        self,
        system_prompt: str,
        conversation_history: list[dict],
        max_tokens: int = 2048
    ) -> str:
        """Generate a response with conversation history"""
        pass

    @abstractmethod
    def get_provider(self) -> str:
        """Return the provider name"""
        pass

    @abstractmethod
    def get_model(self) -> str:
        """Return the model name"""
        pass


class AnthropicClient(LLMClient):
    """Anthropic Claude API client"""

    def __init__(self, api_key: str, model: str = "claude-sonnet-4-5-20250929"):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model

    def generate(self, prompt: str, max_tokens: int = 2048) -> str:
        response = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            messages=[
                {"role": "user", "content": prompt}
            ],
        )
        return response.content[0].text

    def generate_with_history(
        self,
        system_prompt: str,
        conversation_history: list[dict],
        max_tokens: int = 2048
    ) -> str:
        response = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=conversation_history,
        )
        return response.content[0].text

    def get_provider(self) -> str:
        return "anthropic"

    def get_model(self) -> str:
        return self.model


class OpenAIClient(LLMClient):
    """OpenAI API client"""

    def __init__(self, api_key: str, model: str = "gpt-4o"):
        self.client = openai.OpenAI(api_key=api_key)
        self.model = model

    def generate(self, prompt: str, max_tokens: int = 2048) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            max_tokens=max_tokens,
            messages=[
                {"role": "user", "content": prompt}
            ],
        )
        return response.choices[0].message.content

    def generate_with_history(
        self,
        system_prompt: str,
        conversation_history: list[dict],
        max_tokens: int = 2048
    ) -> str:
        messages = [{"role": "system", "content": system_prompt}] + conversation_history
        response = self.client.chat.completions.create(
            model=self.model,
            max_tokens=max_tokens,
            messages=messages,
        )
        return response.choices[0].message.content

    def get_provider(self) -> str:
        return "openai"

    def get_model(self) -> str:
        return self.model


# Available models configuration
AVAILABLE_MODELS = [
    {
        "provider": "anthropic",
        "model": "claude-sonnet-4-5-20250929",
        "name": "Claude Sonnet 4.5",
    },
    {
        "provider": "anthropic",
        "model": "claude-3-5-haiku-20241022",
        "name": "Claude 3.5 Haiku",
    },
    {
        "provider": "openai",
        "model": "gpt-4o",
        "name": "GPT-4o",
    },
    {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "name": "GPT-4o mini",
    },
]


def create_llm_client(
    provider: str,
    model: str,
    anthropic_api_key: Optional[str] = None,
    openai_api_key: Optional[str] = None,
) -> LLMClient:
    """Factory function to create the appropriate LLM client"""
    if provider == "anthropic":
        if not anthropic_api_key:
            raise ValueError("Anthropic API key is required for Claude models")
        return AnthropicClient(api_key=anthropic_api_key, model=model)
    elif provider == "openai":
        if not openai_api_key:
            raise ValueError("OpenAI API key is required for GPT models")
        return OpenAIClient(api_key=openai_api_key, model=model)
    else:
        raise ValueError(f"Unknown provider: {provider}")
