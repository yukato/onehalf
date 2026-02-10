"""
Embeddings API endpoint for generating text embeddings locally
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services.embedding_service import EmbeddingService, ALLOWED_MODELS

router = APIRouter(prefix="/api", tags=["embeddings"])

MAX_BATCH_SIZE = 100


class EmbeddingRequest(BaseModel):
    texts: list[str]
    model: str | None = None


class EmbeddingResponse(BaseModel):
    embeddings: list[list[float]]
    model: str
    dimensions: int


@router.post("/embeddings", response_model=EmbeddingResponse)
async def create_embeddings(request: EmbeddingRequest):
    if not request.texts:
        raise HTTPException(status_code=400, detail="texts must not be empty")
    if len(request.texts) > MAX_BATCH_SIZE:
        raise HTTPException(status_code=400, detail=f"Maximum batch size is {MAX_BATCH_SIZE}")
    if request.model and request.model not in ALLOWED_MODELS:
        raise HTTPException(status_code=400, detail=f"Model not allowed. Available: {ALLOWED_MODELS}")

    service = EmbeddingService()
    model_name = request.model or service.default_model
    embeddings = service.encode(request.texts, model_name)

    return EmbeddingResponse(
        embeddings=embeddings,
        model=model_name,
        dimensions=service.get_dimensions(model_name),
    )
