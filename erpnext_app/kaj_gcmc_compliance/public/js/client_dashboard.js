frappe.provide('kaj_gcmc_compliance');

kaj_gcmc_compliance.ClientComplianceDashboard = class ClientComplianceDashboard {
    constructor(page) {
        this.page = page;
        this.wrapper = this.page.body;
        this.customer = this.getCustomerFromRoute();
        this.charts = {};
        this.stylesInjected = false;
        this.setupPage();
        this.setupFilters();
        this.setupRouteListener();
        this.refresh();
    }

    setupPage() {
        this.page.set_title(__('Client Compliance Overview'));
        this.injectStyles();
        this.wrapper.innerHTML = `
            <div class="client-compliance-dashboard">
                <div class="client-profile" id="client-profile"></div>
                <div class="summary-cards" id="summary-cards"></div>
                <div class="chart-grid">
                    <div class="chart-card">
                        <h5>${__('Document Types Distribution')}</h5>
                        <div class="chart-container" id="document-type-chart"></div>
                    </div>
                    <div class="chart-card">
                        <h5>${__('Filed Form Types Distribution')}</h5>
                        <div class="chart-container" id="filed-form-type-chart"></div>
                    </div>
                    <div class="chart-card">
                        <h5>${__('Compliance Status Breakdown')}</h5>
                        <div class="chart-container" id="status-breakdown-chart"></div>
                    </div>
                </div>
                <div class="chart-grid large">
                    <div class="chart-card">
                        <h5>${__('Filing Trends (12 Months)')}</h5>
                        <div class="chart-container" id="filing-trends-chart"></div>
                    </div>
                    <div class="chart-card">
                        <h5>${__('Document Upload Activity')}</h5>
                        <div class="chart-container" id="document-upload-chart"></div>
                    </div>
                    <div class="chart-card">
                        <h5>${__('Compliance Renewals')}</h5>
                        <div class="chart-container" id="compliance-renewals-chart"></div>
                    </div>
                </div>
                <div class="audit-timeline" id="audit-timeline">
                    <h5>${__('Audit Timeline')}</h5>
                    <div class="timeline-list"></div>
                </div>
            </div>
        `;
    }

    setupFilters() {
        const currentYear = new Date().getFullYear();
        const yearOptions = Array.from({ length: 6 }, (_, idx) => (currentYear - idx).toString());

        this.yearField = this.page.add_field({
            fieldname: 'year',
            label: __('Year'),
            fieldtype: 'Select',
            options: [''].concat(yearOptions).join('\n'),
            default: currentYear.toString(),
            change: () => this.refresh()
        });

        this.documentTypeField = this.page.add_field({
            fieldname: 'document_type',
            label: __('Document Type'),
            fieldtype: 'Select',
            options: [''],
            change: () => this.refresh()
        });
    }

    injectStyles() {
        if (this.stylesInjected) {
            return;
        }
        const style = document.createElement('style');
        style.innerHTML = `
            .client-compliance-dashboard {
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
            }
            .client-compliance-dashboard .profile-card {
                background: var(--bg-light-grey);
                border-radius: 8px;
                padding: 1.5rem;
                box-shadow: var(--shadow-sm);
            }
            .client-compliance-dashboard .profile-card h4 {
                margin-bottom: 1rem;
            }
            .client-compliance-dashboard .profile-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 0.75rem 1.5rem;
            }
            .client-compliance-dashboard .profile-field label {
                font-size: 0.75rem;
                text-transform: uppercase;
                color: var(--text-muted);
                display: block;
            }
            .client-compliance-dashboard .profile-notes {
                margin-top: 1rem;
                font-size: 0.9rem;
            }
            .client-compliance-dashboard .summary-cards {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 1rem;
            }
            .client-compliance-dashboard .summary-card {
                background: var(--card-bg, #fff);
                border: 1px solid var(--border-color, #d1d8dd);
                border-radius: 8px;
                padding: 1rem;
                box-shadow: var(--shadow-sm);
            }
            .client-compliance-dashboard .summary-label {
                font-size: 0.8rem;
                color: var(--text-muted);
                text-transform: uppercase;
                margin-bottom: 0.5rem;
            }
            .client-compliance-dashboard .summary-value {
                font-size: 1.5rem;
                font-weight: 600;
            }
            .client-compliance-dashboard .chart-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 1rem;
            }
            .client-compliance-dashboard .chart-grid.large {
                grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            }
            .client-compliance-dashboard .chart-card {
                background: var(--card-bg, #fff);
                border: 1px solid var(--border-color, #d1d8dd);
                border-radius: 8px;
                padding: 1rem;
                box-shadow: var(--shadow-sm);
            }
            .client-compliance-dashboard .chart-card h5 {
                margin-bottom: 1rem;
                font-size: 1rem;
            }
            .client-compliance-dashboard .chart-container {
                min-height: 240px;
            }
            .client-compliance-dashboard .audit-timeline {
                background: var(--card-bg, #fff);
                border: 1px solid var(--border-color, #d1d8dd);
                border-radius: 8px;
                padding: 1rem;
                box-shadow: var(--shadow-sm);
            }
            .client-compliance-dashboard .timeline-list {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                margin-top: 1rem;
            }
            .client-compliance-dashboard .timeline-entry {
                border-left: 3px solid var(--primary, #5E64FF);
                padding-left: 1rem;
            }
            .client-compliance-dashboard .timeline-header {
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem 1rem;
                font-weight: 500;
            }
            .client-compliance-dashboard .timeline-time {
                color: var(--text-muted);
            }
            .client-compliance-dashboard .empty-state {
                text-align: center;
                padding: 2rem 1rem;
                color: var(--text-muted);
            }
        `;
        document.head.appendChild(style);
        this.stylesInjected = true;
    }

    setupRouteListener() {
        window.addEventListener('hashchange', () => {
            const newCustomer = this.getCustomerFromRoute();
            if (newCustomer !== this.customer) {
                this.customer = newCustomer;
                this.refresh();
            }
        });
    }

    getCustomerFromRoute() {
        const params = frappe.utils.get_query_params();
        if (params.customer) {
            return params.customer;
        }
        if (frappe.route_options && frappe.route_options.customer) {
            const customer = frappe.route_options.customer;
            delete frappe.route_options.customer;
            return customer;
        }
        return this.customer;
    }

    refresh() {
        if (!this.customer) {
            this.showEmptyState();
            return;
        }

        this.page.set_indicator(__('Loading'), 'orange');
        frappe.call({
            method: 'kaj_gcmc_compliance.api.dashboard.get_dashboard_data',
            args: {
                customer_id: this.customer,
                year: this.yearField ? this.yearField.get_value() : null,
                document_type: this.documentTypeField ? this.documentTypeField.get_value() : null
            }
        }).then(r => {
            const data = r.message || {};
            this.updateFilters(data.filters || {});
            this.updateProfile(data.customer || {});
            this.updateSummary(data.summary || {});
            this.updateCharts(data.charts || {});
            this.updateTimeline(data.audit_timeline || []);
            this.page.set_indicator(__('Ready'), 'green');
        }).catch(() => {
            this.page.set_indicator(__('Error'), 'red');
        });
    }

    showEmptyState() {
        this.wrapper.querySelector('#client-profile').innerHTML = `
            <div class="empty-state">
                <h4>${__('Select a Customer')}</h4>
                <p>${__('Use the customer picker or open this dashboard from a Customer record.')}</p>
            </div>
        `;
        this.wrapper.querySelector('#summary-cards').innerHTML = '';
        this.wrapper.querySelector('#audit-timeline .timeline-list').innerHTML = '';
        Object.values(this.charts || {}).forEach(chart => chart && chart.update && chart.update({ labels: [], datasets: [] }));
    }

    updateFilters(filters) {
        const types = [''].concat(filters.document_types || []);
        if (this.documentTypeField) {
            this.documentTypeField.df.options = types.join('\n');
            this.documentTypeField.refresh();
        }
    }

    updateProfile(profile) {
        const container = this.wrapper.querySelector('#client-profile');
        if (!profile || Object.keys(profile).length === 0) {
            container.innerHTML = '';
            return;
        }
        container.innerHTML = `
            <div class="profile-card">
                <h4>${frappe.utils.escape_html(profile.customer_name || this.customer)}</h4>
                <div class="profile-grid">
                    ${this.renderProfileField(__('Business Registration No'), profile.business_registration_no)}
                    ${this.renderProfileField(__('TIN'), profile.tin)}
                    ${this.renderProfileField(__('NIS'), profile.nis)}
                    ${this.renderProfileField(__('Sector'), profile.sector)}
                    ${this.renderProfileField(__('Assigned Staff'), profile.assigned_staff)}
                    ${this.renderProfileField(__('Digital Folder ID'), profile.digital_folder_id)}
                </div>
                ${profile.notes ? `<div class="profile-notes"><strong>${__('Notes')}:</strong> ${frappe.utils.escape_html(profile.notes)}</div>` : ''}
            </div>
        `;
    }

    renderProfileField(label, value) {
        if (!value) {
            return '';
        }
        return `
            <div class="profile-field">
                <label>${label}</label>
                <div>${frappe.utils.escape_html(value)}</div>
            </div>
        `;
    }

    updateSummary(summary) {
        const container = this.wrapper.querySelector('#summary-cards');
        const items = [
            {
                label: __('Total Documents'),
                value: summary.total_documents || 0
            },
            {
                label: __('Total Filed Forms'),
                value: summary.total_filed_forms || 0
            },
            {
                label: __('Expiring Within 30 Days'),
                value: summary.expiring_within_30_days || 0
            },
            {
                label: __('Compliance Health Score'),
                value: summary.compliance_health_score != null ? summary.compliance_health_score : '--',
                suffix: summary.compliance_health_score != null ? '%' : ''
            },
            {
                label: __('Last Filing Date'),
                value: summary.last_filing_date ? frappe.datetime.str_to_user(summary.last_filing_date) : __('Not Available')
            },
            {
                label: __('Next Renewal Date'),
                value: summary.next_renewal_date ? frappe.datetime.str_to_user(summary.next_renewal_date) : __('Not Scheduled')
            }
        ];

        container.innerHTML = items.map(item => this.renderSummaryCard(item)).join('');
    }

    renderSummaryCard({ label, value, suffix }) {
        const displayValue = value === undefined || value === null ? '--' : value;
        return `
            <div class="summary-card">
                <div class="summary-label">${label}</div>
                <div class="summary-value">${displayValue}${suffix || ''}</div>
            </div>
        `;
    }

    updateCharts(charts) {
        this.renderOrUpdateChart('document-type-chart', 'pie', charts.document_type_distribution);
        this.renderOrUpdateChart('filed-form-type-chart', 'pie', charts.filed_form_type_distribution);
        this.renderOrUpdateChart('status-breakdown-chart', 'pie', charts.compliance_status_breakdown);
        this.renderOrUpdateChart('filing-trends-chart', 'line', charts.filing_trends);
        this.renderOrUpdateChart('document-upload-chart', 'bar', charts.document_upload_activity);
        this.renderOrUpdateChart('compliance-renewals-chart', 'bar', charts.compliance_renewals);
    }

    renderOrUpdateChart(elementId, type, data) {
        const el = this.wrapper.querySelector(`#${elementId}`);
        if (!el) return;

        const normalized = this.normalizeChartData(data);
        if (!this.charts[elementId]) {
            this.charts[elementId] = new frappe.Chart(el, {
                title: null,
                data: normalized,
                type,
                height: 260,
                colors: ['#5E64FF', '#3AD0F5', '#FFA00A', '#FF5858', '#7CD6FD']
            });
        } else {
            this.charts[elementId].update(normalized);
        }
    }

    normalizeChartData(data) {
        const fallback = { labels: [''], datasets: [{ name: 'Data', values: [0] }] };
        if (!data || !Array.isArray(data.labels) || !Array.isArray(data.datasets)) {
            return fallback;
        }
        const hasValues = data.datasets.some(dataset => (dataset.values || []).some(value => value));
        if (!hasValues) {
            const labels = data.labels.length ? data.labels : [''];
            return { labels, datasets: data.datasets.map(ds => Object.assign({}, ds, { values: ds.values.length ? ds.values : [0] })) };
        }
        return data;
    }

    updateTimeline(entries) {
        const list = this.wrapper.querySelector('#audit-timeline .timeline-list');
        if (!entries || !entries.length) {
            list.innerHTML = `<div class="empty-state">${__('No audit activity logged yet.')}</div>`;
            return;
        }

        list.innerHTML = entries
            .map(entry => {
                const timestamp = entry.timestamp ? frappe.datetime.str_to_user(entry.timestamp) : '';
                const payload = entry.payload || {};
                const previous = payload.previous ? frappe.utils.escape_html(payload.previous) : '';
                const current = payload.current ? frappe.utils.escape_html(payload.current) : '';
                return `
                    <div class="timeline-entry">
                        <div class="timeline-header">
                            <span class="timeline-user">${frappe.utils.escape_html(entry.user || __('System'))}</span>
                            <span class="timeline-action">${frappe.utils.escape_html(entry.action || '')}</span>
                            <span class="timeline-time">${timestamp}</span>
                        </div>
                        <div class="timeline-entity">${frappe.utils.escape_html(entry.entity || '')}</div>
                        ${entry.remarks ? `<div class="timeline-remarks">${frappe.utils.escape_html(entry.remarks)}</div>` : ''}
                        <div class="timeline-payload">
                            ${previous ? `<div><strong>${__('Previous')}:</strong> ${previous}</div>` : ''}
                            ${current ? `<div><strong>${__('Current')}:</strong> ${current}</div>` : ''}
                        </div>
                    </div>
                `;
            })
            .join('');
    }
};

frappe.pages['client-compliance-overview'].on_page_load = function (wrapper) {
    if (!wrapper.client_dashboard) {
        wrapper.client_dashboard = new kaj_gcmc_compliance.ClientComplianceDashboard(
            frappe.ui.make_app_page({
                parent: wrapper,
                title: __('Client Compliance Overview'),
                single_column: true
            })
        );
    }
};

frappe.pages['client-compliance-overview'].on_page_show = function (wrapper) {
    if (wrapper.client_dashboard) {
        const customer = wrapper.client_dashboard.getCustomerFromRoute();
        if (customer !== wrapper.client_dashboard.customer) {
            wrapper.client_dashboard.customer = customer;
        }
        wrapper.client_dashboard.refresh();
    }
};

