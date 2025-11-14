# Filed Form Item – Schema

A child table that records every official filing done on behalf of a client.

## Core Fields

| Field             | Type    | Description                                  |
|-------------------|---------|----------------------------------------------|
| form_code         | Select  | Official form code / name (GRA, NIS, DCRA)  |
| issuer_authority  | Select  | GRA / NIS / DCRA / Police / Immigration / Other |
| filing_date       | Date    | Date submitted to the authority             |
| received_date     | Date    | Date acknowledged / stamped                 |
| status            | Select  | Draft / Filed / Accepted / Rejected         |
| amount_paid       | Currency| Amount paid (if applicable)                 |
| reference_number  | Data    | Reference, receipt or filing number         |
| expiry_date       | Date    | Valid‑to date for certificate‑style filings |
| attached_document | Attach  | Scan/PDF of form or acknowledgement         |
| remarks           | Small Text | Free‑form notes                         |

## Example Form Codes (non‑exhaustive)

**GRA – Registration**
- G0015 – Individual TIN Registration
- G0016 – Organisation TIN Registration

**GRA – Income Tax**
- G0004 – Individual Income Tax Return
- G0003 – Corporation Tax Return
- G0017 – Financial Statements Summary (Balance Sheet)
- G0018 – Financial Statements Summary (Profit & Loss)

**GRA – PAYE & VAT**
- Form 2 – Annual PAYE Reconciliation
- PAYE Return – Monthly
- G0002 – Value Added Tax (VAT) Return
- G0001 – VAT Imported Services

**GRA – Other Taxes**
- G0009 – Company Property Tax Return
- G0010 – Individual Property Tax Return
- G0022 – Withholding Tax Return
- G0007 – Capital Gains Tax Return

**NIS – Registration**
- R400F1 – Employer Registration
- R400F4 – Employed Person Registration
- R400F4A – Self‑Employed Registration

**NIS – Contributions**
- F200F6 – Contribution Schedule (Weekly)
- F200F3 – Contribution Schedule (Electronic)
- F200F1 – Contribution Schedule (Self‑Employed)

**NIS – Compliance**
- C100F72 – NIS Compliance (Employer)
- C100F72A – NIS Compliance (Self‑Employed)

**Business Registry (DCRA)**
- Application – Business Name Registration
- Articles of Incorporation
- Notice of Directors
- Notice of Change of Directors
