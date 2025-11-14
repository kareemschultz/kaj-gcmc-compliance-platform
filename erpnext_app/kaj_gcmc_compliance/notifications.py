from __future__ import annotations

from typing import Dict

import frappe
from frappe import _
from frappe.utils import add_days, nowdate


def get_notification_config() -> Dict[str, object]:
    """Return Desk notification configuration for the compliance workspace."""
    return {
        "for_doctype": {
            "Customer": {
                "label": _("Clients with Expiring Items"),
                "method": "kaj_gcmc_compliance.notifications.get_expiring_customers",
            }
        }
    }


def get_expiring_customers() -> int:
    """Return a count of customers with compliance items expiring within 30 days."""
    threshold = add_days(nowdate(), 30)
    expiring_documents = frappe.get_all(
        "Compliance Document Item",
        filters={"expiry_date": ["between", [nowdate(), threshold]]},
        fields=["parent"],
        group_by="parent",
    )
    expiring_forms = frappe.get_all(
        "Filed Form Item",
        filters={"expiry_date": ["between", [nowdate(), threshold]]},
        fields=["parent"],
        group_by="parent",
    )
    customer_ids = {doc.get("parent") for doc in expiring_documents}
    customer_ids.update({form.get("parent") for form in expiring_forms})
    return len({cid for cid in customer_ids if cid})
