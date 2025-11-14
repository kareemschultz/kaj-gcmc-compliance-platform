# Import Templates – ERPNext Data Import

These CSV formats are used to bootstrap data into the system.

## 1. Customer Import (`customers.csv`)

| name        | tin     | nis_number | email             | phone        | address_line1 | city        |
|-------------|---------|------------|-------------------|--------------|---------------|-------------|
| ABC Ltd     | 123456  | 789012     | info@abc.gy       | 592-600-1234 | 45 High St    | Georgetown  |

## 2. Filed Forms Import (`filed_forms.csv`)

| customer | form_code | issuer_authority | filing_date | status | reference_number | amount_paid |
|----------|-----------|------------------|------------|--------|------------------|-------------|
| ABC Ltd  | G0003     | GRA              | 2025-05-10 | Filed  | 2025-TAX-001     | 150000      |

## 3. Documents Import (`documents.csv`)

| customer | document_type               | issue_date | expiry_date | attached_file           |
|----------|-----------------------------|-----------|------------|-------------------------|
| ABC Ltd  | NIS Compliance Certificate | 2025-01-01 | 2026-01-01 | /files/nis_abc.pdf |
