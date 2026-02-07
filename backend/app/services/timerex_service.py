"""
TimeRex API Service for fetching appointments
"""

import logging
import time
from datetime import datetime, timedelta
from typing import Generator, Optional

import requests

from ..config import get_settings

logger = logging.getLogger(__name__)


class TimeRexService:
    """Service for interacting with TimeRex API"""

    def __init__(self):
        settings = get_settings()
        self.api_key = settings.timerex_api_key
        self.base_url = settings.timerex_base_url.rstrip("/")
        self.calendar_ids = [
            cid.strip()
            for cid in settings.timerex_calendar_ids.split(",")
            if cid.strip()
        ]
        self.max_retries = 3
        self.retry_delay = 0.5

    def is_configured(self) -> bool:
        """Check if TimeRex API is configured"""
        return bool(self.api_key)

    def _make_request(
        self, endpoint: str, params: Optional[dict] = None
    ) -> dict:
        """Make a request to TimeRex API with retry logic"""
        if not self.is_configured():
            raise ValueError("TimeRex API key is not configured")

        url = f"{self.base_url}{endpoint}"
        headers = {
            "X-Api-Key": self.api_key,
            "Accept": "application/json",
        }

        for attempt in range(self.max_retries):
            try:
                response = requests.get(url, headers=headers, params=params, timeout=30)
                response.raise_for_status()
                return response.json()
            except requests.exceptions.RequestException as e:
                logger.warning(
                    f"TimeRex API request failed (attempt {attempt + 1}/{self.max_retries}): {e}"
                )
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay * (attempt + 1))
                else:
                    raise

    def _make_request_with_url(self, url: str) -> dict:
        """Make a request to a full URL (for pagination)"""
        if not self.is_configured():
            raise ValueError("TimeRex API key is not configured")

        headers = {
            "X-Api-Key": self.api_key,
            "Accept": "application/json",
        }

        for attempt in range(self.max_retries):
            try:
                response = requests.get(url, headers=headers, timeout=30)
                response.raise_for_status()
                return response.json()
            except requests.exceptions.RequestException as e:
                logger.warning(
                    f"TimeRex API request failed (attempt {attempt + 1}/{self.max_retries}): {e}"
                )
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay * (attempt + 1))
                else:
                    raise

    def fetch_appointments(
        self,
        since: Optional[datetime] = None,
        until: Optional[datetime] = None,
        calendar_ids: Optional[list[str]] = None,
    ) -> Generator[dict, None, None]:
        """
        Fetch appointments from TimeRex API with pagination.

        Args:
            since: Start date filter (defaults to 30 days ago)
            until: End date filter (defaults to 30 days from now)
            calendar_ids: List of calendar IDs to filter (defaults to configured IDs)

        Yields:
            Normalized appointment dictionaries
        """
        if not self.is_configured():
            logger.warning("TimeRex API is not configured, skipping fetch")
            return

        # Default date range: 30 days ago to 30 days from now
        if since is None:
            since = datetime.now() - timedelta(days=30)
        if until is None:
            until = datetime.now() + timedelta(days=30)

        # Use configured calendar IDs if not specified
        if calendar_ids is None:
            calendar_ids = self.calendar_ids

        params = {
            "since": since.isoformat(),
            "until": until.isoformat(),
        }
        if calendar_ids:
            params["calendar_ids"] = ",".join(calendar_ids)

        logger.info(f"Fetching TimeRex appointments: since={since}, until={until}, calendars={calendar_ids}")

        # Initial request
        data = self._make_request("/appointments", params)

        while True:
            appointments = data.get("data", [])
            for appointment in appointments:
                yield self._normalize_appointment(appointment)

            # Check for next page
            next_url = data.get("meta", {}).get("next")
            if not next_url:
                break

            data = self._make_request_with_url(next_url)

    def _normalize_appointment(self, raw: dict) -> dict:
        """
        Normalize TimeRex appointment data to a consistent format.

        Args:
            raw: Raw appointment data from TimeRex API

        Returns:
            Normalized appointment dictionary
        """
        # Handle flexible field naming (nested vs flat)
        def get_nested(obj: dict, *keys):
            """Get value from nested or flat structure"""
            for key in keys:
                if "." in key:
                    parts = key.split(".")
                    val = obj
                    for part in parts:
                        if isinstance(val, dict):
                            val = val.get(part)
                        else:
                            val = None
                            break
                    if val is not None:
                        return val
                elif key in obj:
                    return obj[key]
            return None

        # Map status
        raw_status = str(get_nested(raw, "status") or "").lower()
        if raw_status in ("canceled", "cancelled"):
            status = "cancelled"
        elif raw_status in ("completed", "done"):
            status = "completed"
        elif raw_status == "no_show":
            status = "no_show"
        else:
            status = "scheduled"

        return {
            "external_id": str(raw.get("id", "")),
            "title": get_nested(raw, "title"),
            "start_at": get_nested(raw, "start_at", "start"),
            "end_at": get_nested(raw, "end_at", "end"),
            "timezone": get_nested(raw, "timezone"),
            "guest_name": get_nested(raw, "guest.name", "guest_name"),
            "guest_email": get_nested(raw, "guest.email", "guest_email"),
            "guest_phone": get_nested(raw, "guest.phone", "guest_phone"),
            "status": status,
            "canceled_at": get_nested(raw, "canceled_at", "cancelled_at"),
            "host_name": get_nested(raw, "host.name", "host_name"),
            "host_email": get_nested(raw, "host.email", "host_email"),
            "host_id": get_nested(raw, "host.id", "host_id"),
            "meeting_url": get_nested(raw, "meeting_url"),
            "booking_url": get_nested(raw, "booking_url", "public_url"),
            "calendar_id": get_nested(raw, "calendar_id", "calendar.id"),
            "raw_payload": raw,
        }


# Singleton instance
_timerex_service: Optional[TimeRexService] = None


def get_timerex_service() -> TimeRexService:
    """Get or create TimeRex service singleton"""
    global _timerex_service
    if _timerex_service is None:
        _timerex_service = TimeRexService()
    return _timerex_service
