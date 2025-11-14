# Customer Custom Fields

These fields extend the ERPNext **Customer** DocType to track high‑level compliance.

## Section: Specific Compliance Status

| Fieldname                        | Label                          | Type   | Options                                              |
|----------------------------------|--------------------------------|--------|------------------------------------------------------|
| tender_compliance_status         | Tender Compliance Status       | Select | Not Applicable, None, Temporary, Standard, Trusted Trader |
| tender_compliance_expiry         | Tender Compliance Expiry       | Date   | ‑                                                    |
| land_compliance_status           | Land Compliance Status         | Select | Not Applicable, None, Applied, Issued               |
| land_compliance_expiry           | Land Compliance Expiry         | Date   | ‑                                                    |
| work_permit_compliance_status    | Work Permit Compliance Status  | Select | Not Applicable, None, Applied, Issued               |
| work_permit_compliance_expiry    | Work Permit Compliance Expiry  | Date   | ‑                                                    |
| firearm_liability_status         | Firearm Liability Status       | Select | Not Applicable, None, Applied, Letter Issued        |
| firearm_liability_expiry         | Firearm Liability Expiry       | Date   | ‑                                                    |
| nis_compliance_status            | NIS Compliance Status          | Select | Not Applicable, None, Applied, Certificate Issued   |
| nis_compliance_expiry            | NIS Compliance Expiry          | Date   | ‑                                                    |
| gra_compliance_status            | GRA Compliance Status          | Select | Not Applicable, None, Applied, Certificate Issued   |
| gra_compliance_expiry            | GRA Compliance Expiry          | Date   | ‑                                                    |
| pension_status                   | Pension Status                 | Select | Not Applicable, Pending, Active, Retired            |

All of these appear below a **Section Break** labeled “Specific Compliance Status” on the Customer form.
