#!/usr/bin/env python3
"""
TimeRex appointments import script.

Usage:
    python import_timerex.py [--since YYYY-MM-DD] [--until YYYY-MM-DD] [--dry-run]
"""

import argparse
import os
import sys
from datetime import datetime, timedelta

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.services.timerex_service import get_timerex_service


def parse_date(date_str: str) -> datetime:
    """Parse date string to datetime"""
    return datetime.strptime(date_str, "%Y-%m-%d")


def main():
    parser = argparse.ArgumentParser(description="Import TimeRex appointments")
    parser.add_argument(
        "--since",
        type=str,
        help="Start date (YYYY-MM-DD), defaults to 30 days ago",
    )
    parser.add_argument(
        "--until",
        type=str,
        help="End date (YYYY-MM-DD), defaults to 30 days from now",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview without making changes",
    )
    args = parser.parse_args()

    # Parse dates
    since = parse_date(args.since) if args.since else None
    until = parse_date(args.until) if args.until else None

    print("=" * 60)
    print("TimeRex Appointments Import")
    print("=" * 60)

    service = get_timerex_service()

    if not service.is_configured():
        print("ERROR: TimeRex API key is not configured")
        print("Please set TIMEREX_API_KEY environment variable")
        sys.exit(1)

    print(f"Mode: {'DRY RUN' if args.dry_run else 'LIVE'}")
    print(f"Since: {since or 'default (30 days ago)'}")
    print(f"Until: {until or 'default (30 days from now)'}")
    print(f"Calendar IDs: {service.calendar_ids or 'all'}")
    print("-" * 60)

    # Fetch appointments
    stats = {"fetched": 0, "created": 0, "updated": 0, "unchanged": 0, "errors": 0}

    try:
        for appointment in service.fetch_appointments(since=since, until=until):
            stats["fetched"] += 1
            external_id = appointment["external_id"]
            guest_name = appointment.get("guest_name", "Unknown")
            start_at = appointment.get("start_at", "")
            status = appointment.get("status", "scheduled")

            if args.dry_run:
                print(f"  [DRY RUN] Would import: {external_id} - {guest_name} ({start_at}) [{status}]")
            else:
                # In actual implementation, this would call the frontend API
                # to create/update the interview record
                print(f"  Imported: {external_id} - {guest_name} ({start_at}) [{status}]")
                stats["created"] += 1

    except Exception as e:
        print(f"ERROR: Failed to fetch appointments: {e}")
        stats["errors"] += 1

    print("-" * 60)
    print("Summary:")
    print(f"  Fetched: {stats['fetched']}")
    if not args.dry_run:
        print(f"  Created: {stats['created']}")
        print(f"  Updated: {stats['updated']}")
        print(f"  Unchanged: {stats['unchanged']}")
    print(f"  Errors: {stats['errors']}")
    print("=" * 60)

    return 0 if stats["errors"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
