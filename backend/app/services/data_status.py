"""
Data Status Service - Check freshness of loaded data
"""

import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from ..config import Settings


class DataStatusService:
    """Service to check the status of loaded data files"""

    def __init__(self, settings: Settings):
        self.data_base_path = Path(settings.data_base_path)
        self._tz = settings.tz

    def get_data_status(self) -> dict:
        """Get status of all data sources"""
        return {
            "articles": self._get_articles_status(),
            "tickets": self._get_tickets_status(),
            "macros": self._get_macros_status(),
            "updated_at": datetime.now(self._tz).isoformat(),
        }

    def _get_articles_status(self) -> dict:
        """Get FAQ articles status"""
        articles_path = self.data_base_path / "articles" / "all_articles.json"
        metadata_path = self.data_base_path / "embeddings" / "metadata.json"

        status = {
            "name": "FAQ記事",
            "count": 0,
            "latest_item_date": None,
            "file_updated_at": None,
            "embedding_model": None,
        }

        # Get file modification time
        if articles_path.exists():
            mtime = articles_path.stat().st_mtime
            status["file_updated_at"] = datetime.fromtimestamp(mtime, tz=self._tz).isoformat()

            # Load articles to get count and latest date
            try:
                with open(articles_path, "r", encoding="utf-8") as f:
                    articles = json.load(f)
                    status["count"] = len(articles)

                    # Find latest updated_at
                    if articles:
                        latest = max(
                            (a.get("updated_at", "") for a in articles),
                            default=None
                        )
                        status["latest_item_date"] = latest
            except Exception as e:
                status["error"] = str(e)

        # Get metadata
        if metadata_path.exists():
            try:
                with open(metadata_path, "r", encoding="utf-8") as f:
                    metadata = json.load(f)
                    status["embedding_model"] = metadata.get("embedding_model")
            except Exception:
                pass

        return status

    def _get_tickets_status(self) -> dict:
        """Get Zendesk tickets status"""
        tickets_path = self.data_base_path / "tickets" / "solved_tickets.json"
        metadata_path = self.data_base_path / "tickets" / "ticket_metadata.json"

        status = {
            "name": "Zendeskチケット",
            "count": 0,
            "latest_item_date": None,
            "latest_ticket_id": None,
            "file_updated_at": None,
            "embedding_model": None,
        }

        # Get file modification time
        if tickets_path.exists():
            mtime = tickets_path.stat().st_mtime
            status["file_updated_at"] = datetime.fromtimestamp(mtime, tz=self._tz).isoformat()

            # Load tickets to get count and latest date
            try:
                with open(tickets_path, "r", encoding="utf-8") as f:
                    tickets = json.load(f)
                    status["count"] = len(tickets)

                    # Find latest updated_at and ticket_id
                    if tickets:
                        latest_ticket = max(
                            tickets,
                            key=lambda t: t.get("updated_at", ""),
                            default=None
                        )
                        if latest_ticket:
                            status["latest_item_date"] = latest_ticket.get("updated_at")
                            status["latest_ticket_id"] = latest_ticket.get("ticket_id")
            except Exception as e:
                status["error"] = str(e)

        # Get metadata
        if metadata_path.exists():
            try:
                with open(metadata_path, "r", encoding="utf-8") as f:
                    metadata = json.load(f)
                    status["embedding_model"] = metadata.get("model")
            except Exception:
                pass

        return status

    def _get_macros_status(self) -> dict:
        """Get Zendesk macros status"""
        macros_path = self.data_base_path / "macros" / "filtered_macros.json"
        metadata_path = self.data_base_path / "macros" / "macro_metadata.json"

        status = {
            "name": "Zendeskマクロ",
            "count": 0,
            "latest_item_date": None,
            "source_file": None,
            "file_updated_at": None,
            "embedding_model": None,
        }

        # Get file modification time
        if macros_path.exists():
            mtime = macros_path.stat().st_mtime
            status["file_updated_at"] = datetime.fromtimestamp(mtime, tz=self._tz).isoformat()

            # Load macros to get count
            try:
                with open(macros_path, "r", encoding="utf-8") as f:
                    macros = json.load(f)
                    status["count"] = len(macros)
            except Exception as e:
                status["error"] = str(e)

        # Get metadata
        if metadata_path.exists():
            try:
                with open(metadata_path, "r", encoding="utf-8") as f:
                    metadata = json.load(f)
                    status["embedding_model"] = metadata.get("model")
                    status["source_file"] = metadata.get("source_file")
                    status["latest_item_date"] = metadata.get("created_at")
            except Exception:
                pass

        return status
