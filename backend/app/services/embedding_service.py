"""
Shared embedding service for generating text embeddings with multiple model support
"""

from sentence_transformers import SentenceTransformer
from ..config import get_settings

ALLOWED_MODELS = [
    "intfloat/multilingual-e5-small",
    "intfloat/multilingual-e5-base",
    "intfloat/multilingual-e5-large",
]


class EmbeddingService:
    """Service for generating text embeddings with model caching"""
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._models: dict[str, SentenceTransformer] = {}
        settings = get_settings()
        self._default_model = settings.embedding_model
        self._initialized = True

    def _get_model(self, model_name: str) -> SentenceTransformer:
        if model_name not in self._models:
            print(f"Loading embedding model: {model_name}")
            self._models[model_name] = SentenceTransformer(model_name, device='cpu')
        return self._models[model_name]

    def encode(self, texts: list[str], model_name: str | None = None) -> list[list[float]]:
        name = model_name or self._default_model
        model = self._get_model(name)
        embeddings = model.encode(texts)
        return embeddings.tolist()

    def get_dimensions(self, model_name: str | None = None) -> int:
        name = model_name or self._default_model
        model = self._get_model(name)
        return model.get_sentence_embedding_dimension()

    @property
    def default_model(self) -> str:
        return self._default_model
