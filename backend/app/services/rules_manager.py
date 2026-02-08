"""
Operational Rules Manager Service - Manages chatbot system prompt rules
S3バケットが設定されていればS3に保存、なければローカルファイル（開発用）
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Optional

from ..config import Settings
from ..models.schemas import OperationalRule, RuleHistory, RuleChange

logger = logging.getLogger(__name__)

MAX_HISTORY_ENTRIES = 1000


class RulesManager:
    """Singleton service for managing operational rules"""

    _instance: Optional["RulesManager"] = None
    _lock = Lock()

    def __new__(cls, settings: Settings):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self, settings: Settings):
        if self._initialized:
            return

        self.settings = settings
        self.data_base_path = settings.data_base_path
        self.local_file_path = Path(self.data_base_path) / "operational_rules.json"
        self.s3_bucket = settings.chat_logs_bucket
        self.s3_key = "config/operational_rules.json"

        # S3クライアント初期化
        self.s3_client = None
        if self._is_s3_enabled():
            try:
                import boto3
                profile = settings.aws_profile if settings.environment == 'local' and settings.aws_profile else None
                session = boto3.Session(
                    region_name=settings.aws_region,
                    profile_name=profile
                )
                self.s3_client = session.client('s3')
                logger.info(f"Rules manager initialized with S3: s3://{self.s3_bucket}/{self.s3_key}")
            except ImportError:
                logger.warning("boto3 not installed, falling back to local file storage")
            except Exception as e:
                logger.warning(f"Failed to initialize S3 client: {e}, falling back to local file storage")

        self._data: dict = {"rules": [], "history": []}
        self._load_data()
        self._initialized = True

    def _is_s3_enabled(self) -> bool:
        """S3ストレージが有効かどうかを確認"""
        return bool(self.s3_bucket)

    def _load_data(self) -> None:
        """Load rules from S3 or local file"""
        if self._is_s3_enabled() and self.s3_client:
            try:
                response = self.s3_client.get_object(Bucket=self.s3_bucket, Key=self.s3_key)
                content = response['Body'].read().decode('utf-8')
                self._data = json.loads(content)
                logger.info(f"Loaded rules from S3: s3://{self.s3_bucket}/{self.s3_key}")
                return
            except self.s3_client.exceptions.NoSuchKey:
                logger.info(f"No rules file found in S3, will create on first save")
            except Exception as e:
                logger.warning(f"Failed to load rules from S3: {e}, trying local file")

        # Fallback to local file
        if self.local_file_path.exists():
            try:
                with open(self.local_file_path, "r", encoding="utf-8") as f:
                    self._data = json.load(f)
                logger.info(f"Loaded rules from local file: {self.local_file_path}")
            except (json.JSONDecodeError, IOError) as e:
                logger.error(f"Error loading local rules file: {e}")
                self._data = {"rules": [], "history": []}
        else:
            logger.info("No rules file found, starting with empty rules")
            self._data = {"rules": [], "history": []}

    def _save_data(self) -> None:
        """Save rules to S3 or local file"""
        data_json = json.dumps(self._data, ensure_ascii=False, indent=2, default=str)

        if self._is_s3_enabled() and self.s3_client:
            try:
                self.s3_client.put_object(
                    Bucket=self.s3_bucket,
                    Key=self.s3_key,
                    Body=data_json.encode('utf-8'),
                    ContentType='application/json',
                )
                logger.info(f"Saved rules to S3: s3://{self.s3_bucket}/{self.s3_key}")
                return
            except Exception as e:
                logger.error(f"Failed to save rules to S3: {e}, falling back to local file")

        # Fallback to local file
        try:
            self.local_file_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.local_file_path, "w", encoding="utf-8") as f:
                f.write(data_json)
            logger.info(f"Saved rules to local file: {self.local_file_path}")
        except IOError as e:
            logger.error(f"Failed to save rules to local file: {e}")

    def _add_history(
        self,
        rule_id: str,
        action: str,
        username: str,
        changes: dict[str, RuleChange] | None = None,
    ) -> None:
        """Add a history entry"""
        history_entry = {
            "id": str(uuid.uuid4()),
            "rule_id": rule_id,
            "action": action,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "username": username,
            "changes": {k: {"old": v.old, "new": v.new} for k, v in (changes or {}).items()},
        }
        self._data["history"].insert(0, history_entry)
        self._data["history"] = self._data["history"][:MAX_HISTORY_ENTRIES]

    @staticmethod
    def _to_rule(r: dict) -> OperationalRule:
        """Convert a rule dict to an OperationalRule model"""
        return OperationalRule(
            id=r["id"],
            title=r["title"],
            content=r["content"],
            enabled=r.get("enabled", True),
            order=r.get("order", 0),
            target_gender=r.get("target_gender"),
            created_at=datetime.fromisoformat(r["created_at"]),
            updated_at=datetime.fromisoformat(r["updated_at"]),
            updated_by=r.get("updated_by", "system"),
        )

    def get_rules(self, include_disabled: bool = True) -> list[OperationalRule]:
        """Get all rules, optionally filtered by enabled status"""
        rules = [
            self._to_rule(r)
            for r in self._data["rules"]
            if include_disabled or r.get("enabled", True)
        ]
        return sorted(rules, key=lambda x: x.order)

    def get_enabled_rules(self) -> list[OperationalRule]:
        """Get only enabled rules for system prompt injection"""
        return self.get_rules(include_disabled=False)

    def get_rule(self, rule_id: str) -> OperationalRule | None:
        """Get a single rule by ID"""
        for r in self._data["rules"]:
            if r["id"] == rule_id:
                return self._to_rule(r)
        return None

    def create_rule(
        self,
        title: str,
        content: str,
        username: str,
        enabled: bool = True,
        target_gender: list[str] | None = None,
    ) -> OperationalRule:
        """Create a new rule"""
        now = datetime.now(timezone.utc)
        max_order = max((r.get("order", 0) for r in self._data["rules"]), default=0)

        rule_data = {
            "id": str(uuid.uuid4()),
            "title": title,
            "content": content,
            "enabled": enabled,
            "order": max_order + 1,
            "target_gender": target_gender,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "updated_by": username,
        }

        self._data["rules"].append(rule_data)
        self._add_history(
            rule_id=rule_data["id"],
            action="create",
            username=username,
            changes={"title": RuleChange(old=None, new=title)},
        )
        self._save_data()

        return OperationalRule(
            id=rule_data["id"],
            title=rule_data["title"],
            content=rule_data["content"],
            enabled=rule_data["enabled"],
            order=rule_data["order"],
            target_gender=rule_data["target_gender"],
            created_at=now,
            updated_at=now,
            updated_by=username,
        )

    def update_rule(
        self,
        rule_id: str,
        username: str,
        title: str | None = None,
        content: str | None = None,
        enabled: bool | None = None,
        order: int | None = None,
        target_gender: list[str] | None = None,
        update_target_gender: bool = False,  # Flag to distinguish None update from no update
    ) -> OperationalRule | None:
        """Update an existing rule"""
        for i, r in enumerate(self._data["rules"]):
            if r["id"] == rule_id:
                now = datetime.now(timezone.utc)
                changes: dict[str, RuleChange] = {}

                if title is not None and title != r["title"]:
                    changes["title"] = RuleChange(old=r["title"], new=title)
                    r["title"] = title

                if content is not None and content != r["content"]:
                    # Don't store full content in history, just mark as changed
                    changes["content"] = RuleChange(old="(changed)", new="(changed)")
                    r["content"] = content

                if enabled is not None and enabled != r.get("enabled", True):
                    changes["enabled"] = RuleChange(
                        old=str(r.get("enabled", True)),
                        new=str(enabled),
                    )
                    r["enabled"] = enabled

                if order is not None and order != r.get("order", 0):
                    changes["order"] = RuleChange(
                        old=str(r.get("order", 0)),
                        new=str(order),
                    )
                    r["order"] = order

                if update_target_gender:
                    old_gender = r.get("target_gender")
                    if target_gender != old_gender:
                        changes["target_gender"] = RuleChange(
                            old=str(old_gender) if old_gender else None,
                            new=str(target_gender) if target_gender else None,
                        )
                        r["target_gender"] = target_gender

                if changes:
                    r["updated_at"] = now.isoformat()
                    r["updated_by"] = username

                    # Determine action type
                    if "enabled" in changes:
                        action = "enable" if enabled else "disable"
                    else:
                        action = "update"

                    self._add_history(rule_id, action, username, changes)
                    self._save_data()

                return self._to_rule(r)

        return None

    def delete_rule(self, rule_id: str, username: str) -> bool:
        """Delete a rule"""
        for i, r in enumerate(self._data["rules"]):
            if r["id"] == rule_id:
                deleted_rule = self._data["rules"].pop(i)
                self._add_history(
                    rule_id=rule_id,
                    action="delete",
                    username=username,
                    changes={"title": RuleChange(old=deleted_rule["title"], new=None)},
                )
                self._save_data()
                return True
        return False

    def get_history(self, rule_id: str | None = None, limit: int = 50) -> list[RuleHistory]:
        """Get history entries, optionally filtered by rule_id"""
        history = []
        for h in self._data["history"]:
            if rule_id is None or h["rule_id"] == rule_id:
                changes = {}
                for k, v in h.get("changes", {}).items():
                    changes[k] = RuleChange(old=v.get("old"), new=v.get("new"))

                history.append(RuleHistory(
                    id=h["id"],
                    rule_id=h["rule_id"],
                    action=h["action"],
                    timestamp=datetime.fromisoformat(h["timestamp"]),
                    username=h["username"],
                    changes=changes,
                ))
                if len(history) >= limit:
                    break
        return history

    def get_rules_for_prompt(self, gender: str | None = None) -> str:
        """Get formatted rules text for system prompt injection, filtered by gender.

        Args:
            gender: "male" or "female". If None, returns empty (no rules applied).

        Rules are included if:
            - rule.target_gender contains the specified gender
            - If target_gender is None or empty, the rule is NOT included (requires explicit gender setting)
        """
        enabled_rules = self.get_enabled_rules()
        if not enabled_rules:
            return ""

        # Filter rules by gender
        filtered_rules = []
        for rule in enabled_rules:
            target = rule.target_gender
            # Only include rules that explicitly target this gender
            if target and gender and gender in target:
                filtered_rules.append(rule)

        if not filtered_rules:
            return ""

        rules_text = "\n【追加運用ルール】\n"
        for rule in filtered_rules:
            rules_text += f"\n■ {rule.title}\n{rule.content}\n"
        return rules_text


# Singleton getter
_rules_manager: RulesManager | None = None


def get_rules_manager(settings: Settings) -> RulesManager:
    """Get or create the singleton RulesManager instance"""
    global _rules_manager
    if _rules_manager is None:
        _rules_manager = RulesManager(settings)
    return _rules_manager


def init_rules_manager(settings: Settings) -> RulesManager:
    """Initialize the RulesManager with specific settings"""
    global _rules_manager
    _rules_manager = RulesManager(settings)
    return _rules_manager
