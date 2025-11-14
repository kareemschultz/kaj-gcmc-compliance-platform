import collections
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import frappe
from frappe import _
from frappe.utils import add_days, add_months, getdate, nowdate


def _get_documents_and_forms(customer_id: str, year: Optional[int] = None, document_type: Optional[str] = None) -> Tuple[List[Dict], List[Dict]]:
    """Fetch compliance documents and filed forms linked to a customer."""
    if not customer_id:
        frappe.throw(_("Customer ID is required"))

    document_filters: List = [["parent", "=", customer_id], ["parenttype", "=", "Customer"]]
    form_filters: List = [["parent", "=", customer_id], ["parenttype", "=", "Customer"]]

    if document_type:
        document_filters.append(["document_type", "=", document_type])
        # Allow matching by form code for document type filter
        form_filters.append(["form_code", "=", document_type])

    if year:
        start_date = f"{int(year)}-01-01"
        end_date = f"{int(year)}-12-31"
        document_filters.append(["creation", ">=", start_date])
        document_filters.append(["creation", "<=", end_date])
        form_filters.append(["filing_date", ">=", start_date])
        form_filters.append(["filing_date", "<=", end_date])

    documents = frappe.db.get_all(
        "Compliance Document Item",
        filters=document_filters,
        fields=["name", "document_type", "expiry_date", "issue_date", "creation"],
        order_by="creation asc",
    )

    filed_forms = frappe.db.get_all(
        "Filed Form Item",
        filters=form_filters,
        fields=["name", "form_code", "status", "filing_date", "expiry_date", "creation"],
        order_by="filing_date asc",
    )

    return documents, filed_forms


def _generate_month_labels(year: Optional[int] = None) -> List[str]:
    """Return a list of 12 month labels."""
    labels: List[str] = []
    if year:
        current = getdate(f"{int(year)}-01-01")
        for idx in range(12):
            month_date = getdate(add_months(current, idx))
            labels.append(month_date.strftime("%b %Y"))
    else:
        today = getdate(nowdate())
        for idx in range(11, -1, -1):
            month_date = getdate(add_months(today, -idx))
            labels.append(month_date.strftime("%b %Y"))
    return labels


def _month_bucket_map(labels: List[str]) -> Dict[str, int]:
    return collections.OrderedDict((label, 0) for label in labels)


@frappe.whitelist()
def get_document_stats(customer_id: str, year: Optional[int] = None, document_type: Optional[str] = None, include_raw: bool = False):
    """Return aggregated document and filing statistics for a customer."""
    year = int(year) if year else None
    documents, filed_forms = _get_documents_and_forms(customer_id, year=year, document_type=document_type)

    document_distribution: Dict[str, int] = collections.Counter()
    form_distribution: Dict[str, int] = collections.Counter()
    status_breakdown: Dict[str, int] = collections.Counter()

    for doc in documents:
        label = doc.get("document_type") or _("Unspecified")
        document_distribution[label] += 1

    for form in filed_forms:
        form_label = form.get("form_code") or _("Unspecified")
        form_distribution[form_label] += 1
        status_label = form.get("status") or _("Unknown")
        status_breakdown[status_label] += 1

    document_types = sorted({doc.get("document_type") for doc in documents if doc.get("document_type")})

    response = {
        "document_type_distribution": {
            "labels": list(document_distribution.keys()),
            "datasets": [
                {
                    "name": "Documents",
                    "values": list(document_distribution.values()),
                }
            ],
        },
        "filed_form_type_distribution": {
            "labels": list(form_distribution.keys()),
            "datasets": [
                {
                    "name": "Filed Forms",
                    "values": list(form_distribution.values()),
                }
            ],
        },
        "status_breakdown": {
            "labels": list(status_breakdown.keys()),
            "datasets": [
                {
                    "name": "Forms",
                    "values": list(status_breakdown.values()),
                }
            ],
        },
        "document_types": document_types,
    }

    if include_raw:
        response["documents"] = documents
        response["filed_forms"] = filed_forms

    return response


@frappe.whitelist()
def get_filing_trends(customer_id: str, year: Optional[int] = None):
    """Return 12-month filing trend data for a customer."""
    year = int(year) if year else None
    labels = _generate_month_labels(year)
    buckets = _month_bucket_map(labels)

    filters: List = [["parent", "=", customer_id], ["parenttype", "=", "Customer"]]
    if year:
        start_date = f"{year}-01-01"
        end_date = f"{year}-12-31"
        filters.append(["filing_date", ">=", start_date])
        filters.append(["filing_date", "<=", end_date])

    filings = frappe.db.get_all(
        "Filed Form Item",
        filters=filters,
        fields=["filing_date"],
    )

    for entry in filings:
        filing_date = entry.get("filing_date")
        if filing_date:
            label = getdate(filing_date).strftime("%b %Y")
            if label in buckets:
                buckets[label] += 1

    return {
        "labels": list(buckets.keys()),
        "datasets": [
            {
                "name": "Filings",
                "values": list(buckets.values()),
            }
        ],
    }


@frappe.whitelist()
def get_audit_timeline(customer_id: str, limit: int = 50):
    """Return the recent audit log entries for a customer."""
    entries = frappe.db.get_all(
        "Client Audit Log",
        filters={"customer": customer_id},
        fields=[
            "user",
            "action",
            "entity",
            "previous_value",
            "new_value",
            "timestamp",
            "remarks",
        ],
        order_by="timestamp desc",
        limit_page_length=limit,
    )

    timeline = []
    for entry in entries:
        timeline.append(
            {
                "user": entry.get("user"),
                "action": entry.get("action"),
                "entity": entry.get("entity"),
                "timestamp": entry.get("timestamp"),
                "remarks": entry.get("remarks"),
                "payload": {
                    "previous": entry.get("previous_value"),
                    "current": entry.get("new_value"),
                },
            }
        )

    return timeline


@frappe.whitelist()
def get_dashboard_data(customer_id: str, year: Optional[int] = None, document_type: Optional[str] = None):
    """Aggregate dashboard data for the client compliance overview page."""
    year = int(year) if year else None
    document_type = document_type or None

    stats = get_document_stats(customer_id, year=year, document_type=document_type, include_raw=True)
    documents = stats.pop("documents", [])
    filed_forms = stats.pop("filed_forms", [])

    today = getdate(nowdate())
    upcoming_threshold = add_days(today, 30)

    expiring_items = 0
    next_renewal_candidates: List[datetime] = []
    last_filing_date = None

    for doc in documents:
        expiry = doc.get("expiry_date")
        if expiry:
            expiry_date = getdate(expiry)
            if today <= expiry_date <= upcoming_threshold:
                expiring_items += 1
            if expiry_date >= today:
                next_renewal_candidates.append(expiry_date)

    for form in filed_forms:
        filing_date = form.get("filing_date")
        if filing_date:
            filing_date = getdate(filing_date)
            if not last_filing_date or filing_date > last_filing_date:
                last_filing_date = filing_date
        expiry = form.get("expiry_date")
        if expiry:
            expiry_date = getdate(expiry)
            if today <= expiry_date <= upcoming_threshold:
                expiring_items += 1
            if expiry_date >= today:
                next_renewal_candidates.append(expiry_date)

    total_documents = len(documents)
    total_filed_forms = len(filed_forms)

    expired_documents = sum(
        1 for doc in documents if doc.get("expiry_date") and getdate(doc["expiry_date"]) < today
    )
    pending_forms = sum(
        1
        for form in filed_forms
        if (form.get("status") or "").lower() not in {"filed", "accepted"}
    )

    score = 100.0
    if total_documents:
        score -= min(40, (expired_documents / total_documents) * 40)
    else:
        score -= 10
    if total_filed_forms:
        score -= min(40, (pending_forms / total_filed_forms) * 40)
    else:
        score -= 10
    score = max(0, min(100, round(score)))

    next_renewal_date = min(next_renewal_candidates).isoformat() if next_renewal_candidates else None
    last_filing_date_str = last_filing_date.isoformat() if last_filing_date else None

    filing_trends = get_filing_trends(customer_id, year=year)

    # Document upload activity (by creation date)
    upload_labels = filing_trends.get("labels")
    upload_buckets = _month_bucket_map(upload_labels)
    for doc in documents:
        creation = doc.get("creation")
        if creation:
            label = getdate(creation).strftime("%b %Y")
            if label in upload_buckets:
                upload_buckets[label] += 1
    document_upload_activity = {
        "labels": list(upload_buckets.keys()),
        "datasets": [
            {
                "name": "Uploads",
                "values": list(upload_buckets.values()),
            }
        ],
    }

    # Compliance renewals (upcoming 12 months)
    renewal_labels = _generate_month_labels()
    renewal_buckets = _month_bucket_map(renewal_labels)
    for candidate in next_renewal_candidates:
        label = candidate.strftime("%b %Y")
        if label in renewal_buckets:
            renewal_buckets[label] += 1
    compliance_renewals = {
        "labels": list(renewal_buckets.keys()),
        "datasets": [
            {
                "name": "Renewals",
                "values": list(renewal_buckets.values()),
            }
        ],
    }

    customer_profile = frappe.db.get_value(
        "Customer",
        customer_id,
        [
            "customer_name",
            "business_registration_no",
            "tin",
            "nis",
            "sector",
            "assigned_staff",
            "digital_folder_id",
            "notes",
        ],
        as_dict=True,
    )

    audit_timeline = get_audit_timeline(customer_id)

    summary = {
        "total_documents": total_documents,
        "total_filed_forms": total_filed_forms,
        "expiring_within_30_days": expiring_items,
        "compliance_health_score": score,
        "last_filing_date": last_filing_date_str,
        "next_renewal_date": next_renewal_date,
    }

    return {
        "customer": customer_profile or {},
        "summary": summary,
        "charts": {
            "document_type_distribution": stats.get("document_type_distribution"),
            "filed_form_type_distribution": stats.get("filed_form_type_distribution"),
            "compliance_status_breakdown": stats.get("status_breakdown"),
            "filing_trends": filing_trends,
            "document_upload_activity": document_upload_activity,
            "compliance_renewals": compliance_renewals,
        },
        "audit_timeline": audit_timeline,
        "filters": {
            "document_types": stats.get("document_types", []),
        },
    }
