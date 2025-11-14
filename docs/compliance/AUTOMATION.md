# Automation & Workflows

## Scheduled Job – Expiry Checker

Runs daily at 02:00.

High‑level logic:

- For each Customer and each compliance field with an expiry date:
  - If `expiry_date < today`, mark as **Expired**.
  - If `expiry_date < today + 30 days`, mark as **Expiring Soon**.
- Optionally create ToDos or send email notifications.
