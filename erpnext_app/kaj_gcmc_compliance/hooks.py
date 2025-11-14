app_name = "kaj_gcmc_compliance"
app_title = "KAJ GCMC Compliance"
app_publisher = "KAJ & GCMC"
app_email = "info@example.com"
app_license = "MIT"

fixtures = [
    "roles",
    "permissions",
    "filed_form_item",
    "compliance_document_item",
    "client_audit_log",
    "customer_custom_fields",
]

app_include_js = [
    "public/js/client_compliance_dashboard.bundle.js",
]

desk_notifications = [
    "kaj_gcmc_compliance.notifications.get_notification_config",
]

page_info = {
    "client-compliance-overview": "kaj_gcmc_compliance.api.dashboard.get_page_info",
}

doctype_js = {
    "Customer": "public/js/customer_dashboard.js",
}

scheduler_events = {
    "daily": [
        "kaj_gcmc_compliance.automation.expiry_checker",
    ]
}

after_install = "kaj_gcmc_compliance.install.after_install"
