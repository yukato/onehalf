"""
Operational Rules API endpoints - CRUD operations for system prompt rules
"""

from fastapi import APIRouter, Depends, HTTPException, Query

from ..config import get_settings, Settings
from ..middleware.auth import get_current_user
from ..models.schemas import (
    OperationalRule,
    CreateRuleRequest,
    UpdateRuleRequest,
    RulesListResponse,
    RuleHistoryResponse,
)
from ..services.rules_manager import get_rules_manager, RulesManager

router = APIRouter(prefix="/api/rules", tags=["rules"])


def get_rules_manager_dep(settings: Settings = Depends(get_settings)) -> RulesManager:
    return get_rules_manager(settings)


@router.get("", response_model=RulesListResponse)
async def list_rules(
    _: str = Depends(get_current_user),
    rules_manager: RulesManager = Depends(get_rules_manager_dep),
    include_disabled: bool = Query(default=True, description="Include disabled rules"),
):
    """Get all operational rules"""
    rules = rules_manager.get_rules(include_disabled=include_disabled)
    return RulesListResponse(rules=rules, total=len(rules))


@router.get("/history", response_model=RuleHistoryResponse)
async def get_history(
    _: str = Depends(get_current_user),
    rules_manager: RulesManager = Depends(get_rules_manager_dep),
    rule_id: str | None = Query(default=None, description="Filter by rule ID"),
    limit: int = Query(default=50, ge=1, le=200, description="Maximum entries to return"),
):
    """Get rule change history"""
    history = rules_manager.get_history(rule_id=rule_id, limit=limit)
    return RuleHistoryResponse(history=history, total=len(history))


@router.get("/{rule_id}", response_model=OperationalRule)
async def get_rule(
    rule_id: str,
    _: str = Depends(get_current_user),
    rules_manager: RulesManager = Depends(get_rules_manager_dep),
):
    """Get a single rule by ID"""
    rule = rules_manager.get_rule(rule_id)
    if rule is None:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule


@router.post("", response_model=OperationalRule, status_code=201)
async def create_rule(
    request: CreateRuleRequest,
    username: str = Depends(get_current_user),
    rules_manager: RulesManager = Depends(get_rules_manager_dep),
):
    """Create a new operational rule"""
    rule = rules_manager.create_rule(
        title=request.title,
        content=request.content,
        username=username,
        enabled=request.enabled,
        target_gender=request.target_gender,
    )
    return rule


@router.put("/{rule_id}", response_model=OperationalRule)
async def update_rule(
    rule_id: str,
    request: UpdateRuleRequest,
    username: str = Depends(get_current_user),
    rules_manager: RulesManager = Depends(get_rules_manager_dep),
):
    """Update an existing rule"""
    rule = rules_manager.update_rule(
        rule_id=rule_id,
        username=username,
        title=request.title,
        content=request.content,
        enabled=request.enabled,
        order=request.order,
        target_gender=request.target_gender,
        update_target_gender=True,  # Always update target_gender when provided in request
    )
    if rule is None:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule


@router.delete("/{rule_id}", status_code=204)
async def delete_rule(
    rule_id: str,
    username: str = Depends(get_current_user),
    rules_manager: RulesManager = Depends(get_rules_manager_dep),
):
    """Delete a rule"""
    success = rules_manager.delete_rule(rule_id, username)
    if not success:
        raise HTTPException(status_code=404, detail="Rule not found")
    return None
