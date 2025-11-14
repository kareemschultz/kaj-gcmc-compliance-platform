# System Overview – KAJ–GCMC Compliance Platform

## 1. Purpose

Provide a single ERPNext-based system used by **KAJ Financial Services** and **GCMC** to manage:

- GRA tax, PAYE, VAT, Property Tax, Withholding and Capital Gains filings
- NIS registrations, contribution schedules, compliance and pension queries
- DCRA business registrations and corporate changes
- Legal / paralegal documents
- Immigration and work permits
- Land, Tender and Firearm liability compliance

## 2. Architecture

- **Customer** is the central entity (individual or organisation).
- Two main **child tables** live on Customer:
  - `Filed Form Item` – tracks submissions to GRA, NIS, DCRA, police, immigration, etc.
  - `Compliance Document Item` – tracks certificates, permits, IDs, business docs and legal documents.
- Custom fields on Customer capture high-level compliance status:
  - Tender, Land, Work Permit, Firearm, Pension, NIS, GRA.
- A separate **Client Audit Log** DocType records all significant changes.
- Dashboards summarize client status and risk by expiry, authority, and category.

### High Level Data Flow

1. Onboard customer (TIN, NIS, registration info).
2. Import or enter historic filings and documents.
3. Maintain ongoing filings (PAYE, VAT, income tax, contributions).
4. Track compliance expiry (tender, land, NIS, etc.).
5. Monitor via dashboards (pie/bar charts, lists).
6. Use audit trail for reviews and investigations.
