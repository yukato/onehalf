"""
Settings API endpoints - LLM model configuration
"""

from fastapi import APIRouter, Depends, HTTPException

from ..models.schemas import (
    SettingsResponse,
    UpdateSettingsRequest,
    CurrentSettings,
    ModelInfo,
)
from ..services.settings_manager import get_settings_manager, SettingsManager
from ..middleware.auth import get_current_user

router = APIRouter(prefix="/api/settings", tags=["settings"])


def get_settings_manager_dep() -> SettingsManager:
    return get_settings_manager()


@router.get("", response_model=SettingsResponse)
async def get_settings(
    _: str = Depends(get_current_user),
    manager: SettingsManager = Depends(get_settings_manager_dep),
):
    """Get current LLM settings and available models"""
    current = manager.get_settings()
    available = manager.get_available_models()

    return SettingsResponse(
        current=CurrentSettings(
            provider=current.provider,
            model=current.model,
        ),
        available_models=[
            ModelInfo(
                provider=m["provider"],
                model=m["model"],
                name=m["name"],
                enabled=m["enabled"],
            )
            for m in available
        ],
    )


@router.put("", response_model=SettingsResponse)
async def update_settings(
    request: UpdateSettingsRequest,
    _: str = Depends(get_current_user),
    manager: SettingsManager = Depends(get_settings_manager_dep),
):
    """Update LLM settings"""
    try:
        updated = manager.update_settings(request.provider, request.model)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    available = manager.get_available_models()

    return SettingsResponse(
        current=CurrentSettings(
            provider=updated.provider,
            model=updated.model,
        ),
        available_models=[
            ModelInfo(
                provider=m["provider"],
                model=m["model"],
                name=m["name"],
                enabled=m["enabled"],
            )
            for m in available
        ],
    )
