# 🇬🇾 KAJ–GCMC Compliance Platform

A unified **ERPNext** framework for Guyana regulatory compliance, designed for the two partner firms:

- **KAJ Financial Services**
- **Green Cresent Management Consultancy (GCMC)**

This platform standardizes how KAJ and GCMC manage:

- GRA (Guyana Revenue Authority) tax returns, PAYE, VAT, Property, Withholding and Capital Gains
- NIS registrations, contribution schedules, compliance and pension queries
- DCRA (Deeds & Commercial Registries Authority) business registrations and changes
- Tender, land, work permit, and firearm liability compliance
- Legal / paralegal documents (affidavits, agreements, wills, settlements)
- Immigration-related work permits, residence permits, visas

---

## 🔧 Tech Summary

- **Core system:** ERPNext / Frappe
- **App name:** `kaj_gcmc_compliance`
- **Repo:** `kaj-gcmc-compliance-platform`
- **Scope:** Custom DocTypes, Child Tables, Custom Fields, Dashboards, Notifications
- **Goal:** A single client profile showing filings, documents, compliance status, and audit trail.

---

## 📂 Repository Layout

```text
docs/                     → All functional documentation
  compliance/             → Schemas, automation, UI blueprints
  references/             → Official links and business rules

erpnext_app/
  kaj_gcmc_compliance/    → ERPNext app skeleton (fixtures, hooks, etc.)

.github/workflows/        → CI pipelines (lint, validate, release)
```

See [`docs/SYSTEM_OVERVIEW.md`](docs/SYSTEM_OVERVIEW.md) for a high‑level system map.
