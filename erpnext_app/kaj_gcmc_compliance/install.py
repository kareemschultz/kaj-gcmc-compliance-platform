from __future__ import annotations

from typing import Dict, Iterable, List

import frappe
from frappe import _

COMPLIANCE_DOCTYPES: List[str] = [
    "Customer",
    "Filed Form Item",
    "Compliance Document Item",
    "Client Audit Log",
    "File",
    "Communication",
    "ToDo",
]

STAFF_PERMISSION_MATRIX: Iterable[Dict[str, str]] = (
    {"role": "KAJ Staff", "business_unit": "KAJ"},
    {"role": "GCMC Staff", "business_unit": "GCMC"},
)


def after_install() -> None:
    """Apply default user permissions for KAJ and GCMC teams after installation."""
    apply_staff_user_permissions()


def apply_staff_user_permissions() -> None:
    """Assign Business Unit permissions to users based on their staff role."""
    for entry in STAFF_PERMISSION_MATRIX:
        role = entry["role"]
        business_unit = entry["business_unit"]
        users_with_role = frappe.get_all(
            "Has Role",
            filters={"role": role},
            fields=["parent"],
        )

        for user_row in users_with_role:
            user = user_row.get("parent")
            if not user or user in {"Administrator", "Guest"}:
                continue

            if not frappe.db.exists(
                "User Permission",
                {
                    "user": user,
                    "allow": "Business Unit",
                    "for_value": business_unit,
                    "applicable_for": "Customer",
                },
            ):
                permission = frappe.get_doc(
                    {
                        "doctype": "User Permission",
                        "user": user,
                        "allow": "Business Unit",
                        "for_value": business_unit,
                        "apply_to_all_doctypes": 0,
                        "applicable_for": "Customer",
                    }
                )
                for doctype in COMPLIANCE_DOCTYPES:
                    permission.append(
                        "user_permission_doctypes",
                        {
                            "document_type": doctype,
                            "apply_to_all_doctypes": 0,
                        },
                    )
                permission.insert(ignore_permissions=True)
            else:
                _synchronise_permission_doctypes(user, business_unit)


def _synchronise_permission_doctypes(user: str, business_unit: str) -> None:
    """Ensure the user permission template includes all compliance doctypes."""
    permission_name = frappe.db.get_value(
        "User Permission",
        {
            "user": user,
            "allow": "Business Unit",
            "for_value": business_unit,
            "applicable_for": "Customer",
        },
        "name",
    )

    if not permission_name:
        return

    permission = frappe.get_doc("User Permission", permission_name)
    existing = {row.document_type for row in permission.user_permission_doctypes}
    missing = [doctype for doctype in COMPLIANCE_DOCTYPES if doctype not in existing]

    if not missing:
        return

    for doctype in missing:
        permission.append(
            "user_permission_doctypes",
            {
                "document_type": doctype,
                "apply_to_all_doctypes": 0,
            },
        )
    permission.save(ignore_permissions=True)
    frappe.msgprint(
        _("Updated permissions for {0} to include compliance doctypes.").format(user),
        alert=True,
    )
