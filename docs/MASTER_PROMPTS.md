# 💎 KAJ–GCMC COMPLIANCE PLATFORM  
# MASTER CODEX PROMPT PACK  
### *The complete structured workflow for building the entire ERPNext compliance system.*

---

## 🧭 Overview

This document contains **all Codex prompts** required to fully build, extend, automate, and deploy the **KAJ–GCMC Compliance Platform** on ERPNext.

Use **ONE prompt at a time** inside GitHub Copilot Workspace (Codex).  
Each prompt is atomic, safe, and builds on previous steps.

---

# 🔥 PHASE 1 — FOUNDATIONS  

### 1.1 — Repository Analysis

```text
Analyze the entire repository structure for the KAJ–GCMC Compliance Platform.

Document:
- What exists
- What is missing
- What needs to be linked
- What requires fixtures
- What requires hooks

Output a summary of system health and the next required technical steps.
```

---

### 1.2 — Validate All Fixtures

```text
Validate all fixtures in erpnext_app/kaj_gcmc_compliance/fixtures/*.json

Ensure:
- Keys are valid ERPNext fields
- Link fields resolve
- Parent doctypes exist
- Child tables are assigned correctly
- No duplicate fieldnames
```

---

# 🧩 PHASE 2 — CORE DOCTYPES  

### 2.1 — Create/Update Missing DocTypes

```text
Create or update ERPNext child DocTypes with JSON fixtures for:

1. Filed Form Item
2. Compliance Document Item
3. Client Audit Log

All doctypes must:
- Include naming rules
- Include all fields from our documentation
- Set correct fieldtypes
- Set correct permissions
- Include indexes where needed
```

---

### 2.2 — Add Customer Compliance Fields

```text
Generate a fixture that adds all required custom fields to Customer:

- TIN
- NIS
- Business Unit (KAJ / GCMC)
- Sector
- Cabinet ID
- Compliance Status Section
- Tender / Land / Work Permit / Firearm statuses
- Expiry dates
- Risk flags
```

---

# 🔐 PHASE 3 — SECURITY  

### 3.1 — Create Roles & Permissions

```text
Create the following roles:

- KAJ Staff
- GCMC Staff
- Compliance Officer
- Filing Clerk
- Document Officer
- Admin
- Read Only

Generate permissions for:
- Filed Form Item
- Compliance Document Item
- Client Audit Log
- File
- Customer
- Communication
- ToDo

Add User Permission fixtures restricting staff to customers in their business unit.

Save all to fixtures.
```

---

# 📊 PHASE 4 — DASHBOARDS & UI  

### 4.1 — Create the Client Compliance Dashboard Page

```text
Create:

- /page/client_compliance_overview/
- Dashboard JS file
- Dashboard Python API
- Summary cards
- Pie charts
- Line charts
- Audit timeline
- Client info panel
- Filters
- Refresh logic

Use Frappe Charts only (no external libraries).

Expose endpoints:
- get_dashboard_data
- get_document_stats
- get_filing_stats
- get_audit_timeline
- get_compliance_score
```

---

### 4.2 — Add Dashboard Tabs Inside Customer

```text
Modify Customer form using property setters.

Add tabs:
- Client Dashboard (embedded)
- Documents (child table)
- Filed Forms (child table)
- Audit Log
- Compliance Flags
- Renewals & Expiry List
```

---

# 🗄️ PHASE 5 — FILE VAULT AUTOMATION  

### 5.1 — Create the File Automation Engine

```text
Create file_automation.py with:

1. Auto-create folder:
   /Compliance Vault/{Customer Name}_{TIN}

2. Auto-name uploaded files:
   {TIN}-{DocumentType}-{YYYYMMDD}-{random}.{ext}

3. Auto-assign tags:
   - Document type
   - Compliance type
   - Business Unit
   - Expiry status

4. Auto-link uploaded files to:
   - Compliance Document Item
   - Customer
   - Audit Log

5. Duplicate detection
6. Auto expiry evaluation

Add hooks:
- File.before_insert
- File.after_insert
- Customer.after_insert

Add System Setting for vault root path.
```

---

# ⚙️ PHASE 6 — COMPLIANCE ENGINE  

### 6.1 — Compliance Scoring Engine

```text
Create compliance_engine.py with:

calculate_compliance_score(customer)
get_required_documents(customer)
get_missing_documents(customer)
get_expired_documents(customer)
get_pending_filings(customer)
generate_risk_flags(customer)

Store result in customer.compliance_score

Create scheduled task to recalc nightly.
```

---

# 📥 PHASE 7 — IMPORT TOOLS  

### 7.1 — Bulk Import Tools

```text
Create import_tools.py with:

1. CSV importer for:
   - Customers
   - Filed Form Items
   - Compliance Documents

2. Folder scanner:
   - Scan folder of PDFs
   - Detect TIN/Name from filename
   - Auto-link to customer
   - Auto-create Document Items
   - Auto-run file automation

Expose desk actions to trigger tools.
```

---

# 🧠 PHASE 8 — ADVANCED FEATURES  

### 8.1 — OCR Extraction + Document Classification

```text
Integrate OCR (Tesseract or Azure).

Features:
- Auto-detect document type
- Extract TIN / NIS
- Detect expiry dates
- Auto-populate Compliance Document Item fields
```

---

### 8.2 — AI Compliance Review Assistant

```text
Create endpoint for AI summary:

- Summaries client compliance position
- Identifies risk
- Suggests missing filings
- Recommends actions

Store result in customer.ai_insights
```

---

# 🚀 PHASE 9 — DEPLOYMENT  

### 9.1 — Package the App for Release

```text
Create:
- setup.py
- MANIFEST.in
- GitHub Release workflow
- Version bump script
- Bench installation README

Ensure app can install cleanly via:
bench get-app <repo_url>
bench install-app kaj_gcmc_compliance
```

---

## ✅ Usage

Run these prompts **one-by-one** in Codex (GitHub Copilot Workspace).  
Do not paste the entire file; pick the section you want to execute.

Each prompt is designed to be atomic and safe.
