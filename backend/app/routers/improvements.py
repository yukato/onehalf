"""
Improvement Recommendations API endpoints - Analyze chat logs and generate article suggestions
"""

from fastapi import APIRouter, Depends, HTTPException, Query

from ..config import get_settings, Settings
from ..middleware.auth import get_current_user
from ..models.schemas import (
    ImprovementSuggestion,
    ArticleDraft,
    ImprovementSuggestionsResponse,
    ArticleDraftsResponse,
    UpdateSuggestionStatusRequest,
    AnalyzeRequest,
)
from ..services.improvement_analyzer import get_improvement_analyzer, ImprovementAnalyzer

router = APIRouter(prefix="/api/improvements", tags=["improvements"])


def get_analyzer_dep(settings: Settings = Depends(get_settings)) -> ImprovementAnalyzer:
    return get_improvement_analyzer(settings)


@router.get("/suggestions", response_model=ImprovementSuggestionsResponse)
async def list_suggestions(
    _: str = Depends(get_current_user),
    analyzer: ImprovementAnalyzer = Depends(get_analyzer_dep),
    status: str | None = Query(default=None, description="Filter by status (pending, in_progress, resolved, dismissed)"),
    limit: int = Query(default=50, ge=1, le=200, description="Maximum entries to return"),
):
    """Get all improvement suggestions"""
    suggestions = analyzer.get_suggestions(status=status, limit=limit)
    return ImprovementSuggestionsResponse(suggestions=suggestions, total=len(suggestions))


@router.get("/suggestions/{suggestion_id}", response_model=ImprovementSuggestion)
async def get_suggestion(
    suggestion_id: str,
    _: str = Depends(get_current_user),
    analyzer: ImprovementAnalyzer = Depends(get_analyzer_dep),
):
    """Get a single suggestion by ID"""
    suggestion = analyzer.get_suggestion(suggestion_id)
    if suggestion is None:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    return suggestion


@router.put("/suggestions/{suggestion_id}/status", response_model=ImprovementSuggestion)
async def update_suggestion_status(
    suggestion_id: str,
    request: UpdateSuggestionStatusRequest,
    _: str = Depends(get_current_user),
    analyzer: ImprovementAnalyzer = Depends(get_analyzer_dep),
):
    """Update the status of a suggestion"""
    valid_statuses = {"pending", "in_progress", "resolved", "dismissed"}
    if request.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    suggestion = analyzer.update_suggestion_status(suggestion_id, request.status)
    if suggestion is None:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    return suggestion


@router.post("/suggestions/{suggestion_id}/generate-draft", response_model=ArticleDraft)
async def generate_draft(
    suggestion_id: str,
    _: str = Depends(get_current_user),
    analyzer: ImprovementAnalyzer = Depends(get_analyzer_dep),
):
    """Generate an article draft for a suggestion"""
    draft = analyzer.generate_article_draft(suggestion_id)
    if draft is None:
        raise HTTPException(status_code=404, detail="Suggestion not found or draft generation failed")
    return draft


@router.get("/drafts", response_model=ArticleDraftsResponse)
async def list_drafts(
    _: str = Depends(get_current_user),
    analyzer: ImprovementAnalyzer = Depends(get_analyzer_dep),
    limit: int = Query(default=50, ge=1, le=200, description="Maximum entries to return"),
):
    """Get all article drafts"""
    drafts = analyzer.get_drafts(limit=limit)
    return ArticleDraftsResponse(drafts=drafts, total=len(drafts))


@router.get("/drafts/{draft_id}", response_model=ArticleDraft)
async def get_draft(
    draft_id: str,
    _: str = Depends(get_current_user),
    analyzer: ImprovementAnalyzer = Depends(get_analyzer_dep),
):
    """Get a single draft by ID"""
    draft = analyzer.get_draft(draft_id)
    if draft is None:
        raise HTTPException(status_code=404, detail="Draft not found")
    return draft


@router.post("/analyze", response_model=ImprovementSuggestionsResponse)
async def analyze_logs(
    request: AnalyzeRequest,
    _: str = Depends(get_current_user),
    analyzer: ImprovementAnalyzer = Depends(get_analyzer_dep),
):
    """Manually trigger analysis of chat logs to generate improvement suggestions"""
    suggestions = await analyzer.analyze_logs(
        days=request.days,
        min_occurrences=request.min_occurrences,
    )
    return ImprovementSuggestionsResponse(suggestions=suggestions, total=len(suggestions))
