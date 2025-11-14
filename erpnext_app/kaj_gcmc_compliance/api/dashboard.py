"""Client Compliance dashboard data providers."""

from __future__ import annotations

import json
from collections import Counter, defaultdict
from datetime import date
from typing import Any, Dict, Iterable, List, Optional, Tuple

import frappe
from frappe import _
from frappe.utils import add_months, cint, getdate, nowdate


@frappe.whitelist()
def get_dashboard_data(customer: str, filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Return the aggregate dashboard payload for a Customer."""

    if not customer:
        frappe.throw(_("Customer is required to load the dashboard."))

    filters = filters or {}

    document_stats = get_document_stats(customer, filters)
    filing_stats = get_filing_stats(customer, filters)
    compliance_health = get_compliance_health_score(customer)
    audit_timeline = get_audit_timeline(customer)
    profile = _get_customer_profile(customer)

    summary = {
        "total_documents": document_stats.get("total_documents", 0),
        "total_filed_forms": filing_stats.get("total_filed_forms", 0),
        "compliance_health_score": compliance_health.get("score", 0),
        "expiring_documents": document_stats.get("expiring_documents", 0),
        "next_compliance_due": document_stats.get("next_compliance_due"),
        "last_filing_date": filing_stats.get("last_filing_date"),
    }

    return {
        "customer": customer,
        "filters": filters,
        "summary": summary,
        "document_stats": document_stats,
        "filing_stats": filing_stats,
        "compliance_health": compliance_health,
        "audit_timeline": audit_timeline,
        "profile": profile,
    }


def get_filing_stats(customer: str, filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Aggregate filing information for the dashboard charts."""

    filters = filters or {}
    filing_doctype = _find_existing_doctype(
        [
            "Compliance Filing",
            "Filed Compliance Form",
            "Compliance Form Submission",
        ]
    )

    if not filing_doctype:
        return {
            "total_filed_forms": 0,
            "filing_trends": {"labels": [], "datasets": [{"name": "Filings", "values": []}]},
            "filed_form_types": {"labels": [], "datasets": [{"name": "Forms", "values": []}]},
            "available_years": [],
            "last_filing_date": None,
        }

    meta = frappe.get_meta(filing_doctype)
    customer_field = _find_fieldname(meta, ["customer", "client", "party", "customer_id"])
    date_field = _find_fieldname(meta, ["filing_date", "date", "submitted_on", "creation", "posting_date"])
    type_field = _find_fieldname(meta, ["form_type", "document_type", "compliance_type", "type"])
    status_field = _find_fieldname(meta, ["status", "state", "workflow_state"])

    if not customer_field:
        return {
            "total_filed_forms": 0,
            "filing_trends": {"labels": [], "datasets": [{"name": "Filings", "values": []}]},
            "filed_form_types": {"labels": [], "datasets": [{"name": "Forms", "values": []}]},
            "available_years": [],
            "last_filing_date": None,
        }

    query_filters: Dict[str, Any] = {customer_field: customer}
    if filters.get("status") and status_field:
        query_filters[status_field] = filters["status"]

    records = frappe.db.get_all(
        filing_doctype,
        filters=query_filters,
        fields=list({f for f in ["name", date_field, type_field, status_field, "creation"] if f}),
        order_by=f"{date_field or 'creation'} desc",
    )

    filed_form_types_counter: Counter[str] = Counter()
    monthly_counter: Dict[str, int] = defaultdict(int)
    available_years: set[int] = set()
    last_filing_date: Optional[str] = None

    year_filter: Optional[int] = None
    if filters.get("year"):
        try:
            year_filter = cint(filters.get("year"))
        except Exception:
            year_filter = None

    filtered_records: List[Tuple[Dict[str, Any], Optional[date]]] = []
    for row in records:
        filing_date = _coerce_date(row.get(date_field) or row.get("creation")) if date_field or "creation" in row else None
        if filing_date:
            available_years.add(filing_date.year)

        if year_filter:
            if not filing_date or filing_date.year != year_filter:
                continue

        filtered_records.append((row, filing_date))

    total_filed_forms = len(filtered_records)

    for idx, (row, filing_date) in enumerate(filtered_records):
        if filing_date:
            key = filing_date.strftime("%Y-%m")
            monthly_counter[key] += 1
            if idx == 0:
                last_filing_date = frappe.utils.format_date(filing_date)

        form_type = row.get(type_field) if type_field else None
        if form_type:
            filed_form_types_counter[form_type] += 1

    trends_labels, trends_values = _series_from_month_counter(monthly_counter, months=12)

    filed_form_types = _chart_from_counter(filed_form_types_counter, chart_name="Filed Forms")

    return {
        "total_filed_forms": total_filed_forms,
        "filing_trends": {
            "labels": trends_labels,
            "datasets": [{"name": "Filings", "values": trends_values}],
        },
        "filed_form_types": filed_form_types,
        "available_years": sorted(available_years, reverse=True),
        "last_filing_date": last_filing_date,
    }


def get_document_stats(customer: str, filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Aggregate document information for the dashboard cards and charts."""

    filters = filters or {}
    document_doctype = _find_existing_doctype(
        [
            "Compliance Document",
            "Compliance Document Item",
            "Customer Document",
        ]
    )

    if not document_doctype:
        return {
            "total_documents": 0,
            "expiring_documents": 0,
            "document_types": {"labels": [], "datasets": [{"name": "Document Types", "values": []}]},
            "status_distribution": {"labels": [], "datasets": [{"name": "Status", "values": []}]},
            "document_upload_activity": {
                "labels": [],
                "datasets": [{"name": "Uploads", "values": []}],
            },
            "compliance_expiry_timeline": {
                "labels": [],
                "datasets": [{"name": "Expiries", "values": []}],
            },
            "available_types": [],
            "available_statuses": [],
            "next_compliance_due": None,
        }

    meta = frappe.get_meta(document_doctype)
    customer_field = _find_fieldname(meta, ["customer", "client", "party", "customer_id"])
    if not customer_field:
        return {
            "total_documents": 0,
            "expiring_documents": 0,
            "document_types": {"labels": [], "datasets": [{"name": "Document Types", "values": []}]},
            "status_distribution": {"labels": [], "datasets": [{"name": "Status", "values": []}]},
            "document_upload_activity": {
                "labels": [],
                "datasets": [{"name": "Uploads", "values": []}],
            },
            "compliance_expiry_timeline": {
                "labels": [],
                "datasets": [{"name": "Expiries", "values": []}],
            },
            "available_types": [],
            "available_statuses": [],
            "next_compliance_due": None,
        }

    doc_type_field = _find_fieldname(meta, ["document_type", "doc_type", "type", "category"])
    expiry_field = _find_fieldname(meta, ["expiry_date", "valid_till", "expiration_date", "end_date"])
    status_field = _find_fieldname(meta, ["status", "compliance_status"])
    upload_field = _find_fieldname(meta, ["uploaded_on", "upload_date", "date", "creation"])

    query_filters: Dict[str, Any] = {customer_field: customer}
    if filters.get("doctype") and doc_type_field:
        query_filters[doc_type_field] = filters["doctype"]
    if filters.get("status") and status_field:
        query_filters[status_field] = filters["status"]

    fields = list({
        f
        for f in ["name", doc_type_field, expiry_field, status_field, upload_field, "creation"]
        if f
    })

    records = frappe.db.get_all(
        document_doctype,
        filters=query_filters,
        fields=fields,
        order_by=f"{upload_field or 'creation'} desc",
    )

    expiring_documents = 0
    next_compliance_due: Optional[str] = None
    document_type_counter: Counter[str] = Counter()
    status_counter: Counter[str] = Counter()
    upload_counter: Dict[str, int] = defaultdict(int)
    expiry_counter: Dict[str, int] = defaultdict(int)

    year_filter: Optional[int] = None
    if filters.get("year"):
        try:
            year_filter = cint(filters.get("year"))
        except Exception:
            year_filter = None

    today = getdate(nowdate())
    filtered_records: List[Tuple[Dict[str, Any], Optional[date], Optional[date]]] = []
    for row in records:
        expiry = _coerce_date(row.get(expiry_field)) if expiry_field else None
        upload_dt = _coerce_date(row.get(upload_field) or row.get("creation"))

        if year_filter:
            if upload_dt and upload_dt.year == year_filter:
                pass
            elif expiry and expiry.year == year_filter:
                pass
            else:
                continue

        filtered_records.append((row, expiry, upload_dt))

    total_documents = len(filtered_records)

    for row, expiry, upload_dt in filtered_records:
        doc_type = row.get(doc_type_field) if doc_type_field else None
        status = row.get(status_field) if status_field else None

        if doc_type:
            document_type_counter[doc_type] += 1
        if status:
            status_counter[status] += 1
        if expiry:
            key = expiry.strftime("%Y-%m")
            expiry_counter[key] += 1
            if expiry >= today:
                if not next_compliance_due or expiry < getdate(next_compliance_due):
                    next_compliance_due = expiry
            if (expiry - today).days <= 30:
                expiring_documents += 1
        if upload_dt:
            key = upload_dt.strftime("%Y-%m")
            upload_counter[key] += 1

    upload_labels, upload_values = _series_from_month_counter(upload_counter, months=12)
    expiry_labels, expiry_values = _series_from_month_counter(expiry_counter, months=12)

    return {
        "total_documents": total_documents,
        "expiring_documents": expiring_documents,
        "document_types": _chart_from_counter(document_type_counter, chart_name="Documents"),
        "status_distribution": _chart_from_counter(status_counter, chart_name="Status"),
        "document_upload_activity": {
            "labels": upload_labels,
            "datasets": [{"name": "Uploads", "values": upload_values}],
        },
        "compliance_expiry_timeline": {
            "labels": expiry_labels,
            "datasets": [{"name": "Expiries", "values": expiry_values}],
        },
        "available_types": sorted(document_type_counter.keys()),
        "available_statuses": sorted(status_counter.keys()),
        "next_compliance_due": frappe.utils.format_date(next_compliance_due) if next_compliance_due else None,
    }


def get_audit_timeline(customer: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieve the Client Audit Log timeline entries."""

    audit_doctype = _find_existing_doctype(["Client Audit Log", "Audit Log", "Customer Audit Log"])
    if not audit_doctype:
        return []

    meta = frappe.get_meta(audit_doctype)
    customer_field = _find_fieldname(meta, ["customer", "client", "party", "reference_customer"])
    if not customer_field:
        return []

    timestamp_field = _find_fieldname(meta, ["timestamp", "event_timestamp", "log_time", "modified", "creation"])
    user_field = _find_fieldname(meta, ["user", "owner", "modified_by", "changed_by"])
    action_field = _find_fieldname(meta, ["action", "event", "activity"])
    payload_field = _find_fieldname(meta, ["payload", "data", "changes", "context"])

    fields = list({f for f in ["name", timestamp_field, user_field, action_field, payload_field] if f})

    records = frappe.db.get_all(
        audit_doctype,
        filters={customer_field: customer},
        fields=fields,
        order_by=f"{timestamp_field or 'modified'} desc",
        limit=limit,
    )

    timeline: List[Dict[str, Any]] = []
    for row in records:
        payload = row.get(payload_field) if payload_field else None
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except Exception:
                pass

        timestamp_value = row.get(timestamp_field) if timestamp_field else row.get("modified")
        timeline.append(
            {
                "timestamp": frappe.utils.format_datetime(timestamp_value) if timestamp_value else None,
                "user": row.get(user_field) or _("Unknown"),
                "action": row.get(action_field) or _("Updated"),
                "payload": payload,
            }
        )

    return timeline


def get_compliance_health_score(customer: str) -> Dict[str, Any]:
    """Compute a synthetic compliance health score based on customer fields."""

    doc = frappe.get_cached_doc("Customer", customer)
    compliance_fields: List[Tuple[str, str, str]] = [
        ("Tender", "tender_compliance_status", "tender_compliance_expiry"),
        ("Land", "land_compliance_status", "land_compliance_expiry"),
        ("Work Permit", "work_permit_compliance_status", "work_permit_compliance_expiry"),
        ("Firearm", "firearm_compliance_status", "firearm_compliance_expiry"),
    ]

    area_scores: List[Tuple[str, int]] = []
    today = getdate(nowdate())

    for area_label, status_field, expiry_field in compliance_fields:
        status_value = (doc.get(status_field) or "").strip()
        expiry_value = _coerce_date(doc.get(expiry_field)) if doc.get(expiry_field) else None
        score = _score_from_status(status_value)
        if expiry_value and expiry_value < today:
            score = max(0, score - 20)
        area_scores.append((area_label, score))

    if area_scores:
        total_score = sum(score for _, score in area_scores) / len(area_scores)
    else:
        total_score = 0

    return {
        "score": cint(round(total_score)),
        "area_breakdown": {
            "labels": [label for label, _ in area_scores],
            "datasets": [{"name": "Compliance", "values": [score for _, score in area_scores]}],
        },
    }


# Helper utilities ---------------------------------------------------------------------------

def _get_customer_profile(customer: str) -> Dict[str, Any]:
    doc = frappe.get_cached_doc("Customer", customer)
    return {
        "customer_name": doc.get("customer_name") or doc.name,
        "customer_id": doc.name,
        "business_registration_number": doc.get("business_registration_number"),
        "tin": doc.get("tax_id") or doc.get("tin"),
        "nis": doc.get("nis") or doc.get("nis_number"),
        "business_type": doc.get("customer_group") or doc.get("business_type"),
        "business_sector": doc.get("industry") or doc.get("business_sector"),
        "assigned_staff": doc.get("account_manager") or doc.get("account_manager_name") or doc.get("assigned_staff"),
        "cabinet_id": doc.get("cabinet_id"),
        "digital_folder_path": doc.get("digital_folder_path"),
        "risk_flags": doc.get("risk_flags") or doc.get("risk_profile"),
    }


def _find_existing_doctype(candidates: Iterable[str]) -> Optional[str]:
    for doctype in candidates:
        if frappe.db.exists("DocType", doctype):
            return doctype
    return None


def _find_fieldname(meta: frappe.model.meta.Meta, candidates: Iterable[str]) -> Optional[str]:
    candidate_set = {name.lower() for name in candidates}
    for df in meta.fields:
        if df.fieldname and df.fieldname.lower() in candidate_set:
            return df.fieldname
    return None


def _coerce_date(value: Any) -> Optional[date]:
    if not value:
        return None
    try:
        return getdate(value)
    except Exception:
        return None


def _series_from_month_counter(counter: Dict[str, int], months: int = 12) -> Tuple[List[str], List[int]]:
    today = getdate(nowdate())
    start_month = add_months(today.replace(day=1), -(months - 1))
    labels: List[str] = []
    values: List[int] = []
    for i in range(months):
        current = add_months(start_month, i)
        current_date = getdate(current)
        key = current_date.strftime("%Y-%m")
        labels.append(current_date.strftime("%b %Y"))
        values.append(counter.get(key, 0))
    return labels, values


def _chart_from_counter(counter: Counter[str], chart_name: str) -> Dict[str, Any]:
    labels = list(counter.keys())
    values = [counter[label] for label in labels]
    return {
        "labels": labels,
        "datasets": [{"name": chart_name, "values": values}],
    }


def _score_from_status(status: str) -> int:
    if not status:
        return 30

    status_normalized = status.strip().lower()
    mapping = {
        "issued": 95,
        "certificate issued": 95,
        "compliant": 95,
        "standard": 90,
        "temporary": 75,
        "applied": 55,
        "pending": 50,
        "none": 30,
        "not applicable": 60,
        "na": 60,
    }

    for key, score in mapping.items():
        if key in status_normalized:
            return score

    return 65
