from __future__ import annotations

from datetime import date
from typing import Iterable, Sequence

import frappe
from frappe import _
from frappe.utils import add_days, nowdate

EXPIRY_DOCTYPES: Iterable[str] = (
    "Compliance Document Item",
    "Filed Form Item",
)


def expiry_checker() -> None:
    """Flag compliance records that are approaching or past their expiry date."""
    today = date.today().isoformat()
    upcoming_threshold = add_days(nowdate(), 30)

    for doctype in EXPIRY_DOCTYPES:
        expired_records = frappe.get_all(
            doctype,
            filters={"expiry_date": ["<", today]},
            fields=["name", "parent", "parenttype", "expiry_date"],
        )
        upcoming_records = frappe.get_all(
            doctype,
            filters={"expiry_date": ["between", [today, upcoming_threshold]]},
            fields=["name", "parent", "parenttype", "expiry_date"],
        )

        if not expired_records and not upcoming_records:
            continue

        _log_scheduler_activity(doctype, expired_records, upcoming_records)


def _log_scheduler_activity(
    doctype: str,
    expired_records: Sequence[dict],
    upcoming_records: Sequence[dict],
) -> None:
    """Write diagnostic output so administrators can verify the scheduler ran."""
    logger = frappe.logger("kaj_gcmc_compliance")
    logger.info(
        "[%s] Expired: %s | Upcoming: %s",
        doctype,
        len(expired_records),
        len(upcoming_records),
    )
    frappe.publish_realtime(
        "kaj_gcmc_compliance.expiry_checker",
        {
            "doctype": doctype,
            "expired": len(expired_records),
            "upcoming": len(upcoming_records),
            "message": _("Compliance expiry check completed."),
        },
        doctype="User",
    )
