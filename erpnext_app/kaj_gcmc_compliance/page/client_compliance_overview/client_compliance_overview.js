frappe.provide('kaj_gcmc_compliance.dashboard');

(() => {
  class ClientComplianceDashboard {
    constructor(options) {
      this.options = options || {};
      this.wrapper = $(this.options.wrapper);
      this.wrapper.addClass('kaj-client-compliance-dashboard');
      this.page = this.options.page;
      this.customer = this.options.customer || null;
      this.hideCustomerFilter = Boolean(this.options.hide_customer_filter);
      this.charts = {};
      this.metricElements = {};
      this.filterControls = {};
      this._is_loading = false;

      this.make_layout();
      this.setup_filters();
      if (this.customer) {
        this.set_customer(this.customer);
      }
    }

    make_layout() {
      const filtersHtml = `
        <div class="dashboard-filters">
          <div class="filter-control" data-filter="customer"></div>
          <div class="filter-control" data-filter="year"></div>
          <div class="filter-control" data-filter="doctype"></div>
          <div class="filter-control" data-filter="status"></div>
        </div>
      `;

      const metricConfig = [
        { key: 'total_documents', label: __('Total Documents') },
        { key: 'total_filed_forms', label: __('Total Filed Forms') },
        { key: 'compliance_health_score', label: __('Compliance Health Score') },
        { key: 'expiring_documents', label: __('Expiring Documents (30d)') },
        { key: 'next_compliance_due', label: __('Next Compliance Due') },
        { key: 'last_filing_date', label: __('Last Filing Date') }
      ];

      const cardsHtml = metricConfig
        .map(
          (metric) => `
            <div class="metric-card" data-metric="${metric.key}">
              <div class="metric-label">${metric.label}</div>
              <div class="metric-value">-</div>
            </div>
          `
        )
        .join('');

      const chartsHtml = `
        <div class="chart-grid">
          <div class="chart-card" data-chart="document_types">
            <div class="chart-title">${__('Document Types Distribution')}</div>
            <div class="chart-body"></div>
          </div>
          <div class="chart-card" data-chart="filed_forms">
            <div class="chart-title">${__('Filed Form Types')}</div>
            <div class="chart-body"></div>
          </div>
          <div class="chart-card" data-chart="compliance_status">
            <div class="chart-title">${__('Compliance Status')}</div>
            <div class="chart-body"></div>
          </div>
        </div>
        <div class="chart-grid">
          <div class="chart-card" data-chart="filing_trends">
            <div class="chart-title">${__('Filing Trends (12 months)')}</div>
            <div class="chart-body"></div>
          </div>
          <div class="chart-card" data-chart="upload_activity">
            <div class="chart-title">${__('Document Upload Activity')}</div>
            <div class="chart-body"></div>
          </div>
          <div class="chart-card" data-chart="expiry_timeline">
            <div class="chart-title">${__('Compliance Expiry Timeline')}</div>
            <div class="chart-body"></div>
          </div>
        </div>
      `;

      const timelineHtml = `
        <div class="timeline-card">
          <div class="timeline-header">${__('Audit Timeline')}</div>
          <div class="timeline-body" data-region="audit-timeline"></div>
        </div>
      `;

      const profileHtml = `
        <div class="profile-card">
          <div class="profile-header">${__('Client Profile')}</div>
          <div class="profile-body" data-region="client-profile"></div>
        </div>
      `;

      const layoutHtml = `
        <div class="client-dashboard-root">
          ${filtersHtml}
          <div class="metric-grid">${cardsHtml}</div>
          ${chartsHtml}
          <div class="lower-panels">
            ${timelineHtml}
            ${profileHtml}
          </div>
        </div>
      `;

      this.wrapper.empty().append(layoutHtml);

      this.metricElements = {};
      metricConfig.forEach((metric) => {
        this.metricElements[metric.key] = this.wrapper.find(`.metric-card[data-metric="${metric.key}"] .metric-value`);
      });

      this.chartRegions = {
        document_types: this.wrapper.find('[data-chart="document_types"] .chart-body')[0],
        filed_forms: this.wrapper.find('[data-chart="filed_forms"] .chart-body')[0],
        compliance_status: this.wrapper.find('[data-chart="compliance_status"] .chart-body')[0],
        filing_trends: this.wrapper.find('[data-chart="filing_trends"] .chart-body')[0],
        upload_activity: this.wrapper.find('[data-chart="upload_activity"] .chart-body')[0],
        expiry_timeline: this.wrapper.find('[data-chart="expiry_timeline"] .chart-body')[0]
      };

      this.timelineRegion = this.wrapper.find('[data-region="audit-timeline"]');
      this.profileRegion = this.wrapper.find('[data-region="client-profile"]');

      if (this.hideCustomerFilter) {
        this.wrapper.find('[data-filter="customer"]').remove();
      }
    }

    setup_filters() {
      const customerFilterWrapper = this.wrapper.find('[data-filter="customer"]');
      if (!this.hideCustomerFilter && customerFilterWrapper.length) {
        this.filterControls.customer = frappe.ui.form.make_control({
          df: {
            fieldtype: 'Link',
            label: __('Customer'),
            options: 'Customer',
            reqd: 1,
            change: () => {
              const value = this.filterControls.customer.get_value();
              if (value) {
                this.set_customer(value);
              }
            }
          },
          parent: customerFilterWrapper,
        });
        this.filterControls.customer.refresh();
      }

      const yearWrapper = this.wrapper.find('[data-filter="year"]');
      this.filterControls.year = frappe.ui.form.make_control({
        df: {
          fieldtype: 'Select',
          label: __('Year'),
          options: this.get_year_options(),
          change: () => this.refresh(),
        },
        parent: yearWrapper,
      });
      this.filterControls.year.refresh();

      const docTypeWrapper = this.wrapper.find('[data-filter="doctype"]');
      this.filterControls.doctype = frappe.ui.form.make_control({
        df: {
          fieldtype: 'Select',
          label: __('Document Type'),
          options: [''].join('\n'),
          change: () => this.refresh(),
        },
        parent: docTypeWrapper,
      });
      this.filterControls.doctype.refresh();

      const statusWrapper = this.wrapper.find('[data-filter="status"]');
      this.filterControls.status = frappe.ui.form.make_control({
        df: {
          fieldtype: 'Select',
          label: __('Status'),
          options: [''].join('\n'),
          change: () => this.refresh(),
        },
        parent: statusWrapper,
      });
      this.filterControls.status.refresh();

      if (this.hideCustomerFilter) {
        customerFilterWrapper.remove();
      }
    }

    get_year_options() {
      const currentYear = new Date().getFullYear();
      const options = [''];
      for (let i = 0; i < 6; i += 1) {
        options.push(String(currentYear - i));
      }
      return options.join('\n');
    }

    set_customer(customer) {
      if (this.customer === customer) {
        this.refresh();
        return;
      }
      this.customer = customer;
      if (this.filterControls.customer && this.filterControls.customer.get_value() !== customer) {
        this.filterControls.customer.set_value(customer);
      }
      this.refresh();
    }

    get_filter_values() {
      return {
        year: this.filterControls.year ? this.filterControls.year.get_value() : null,
        doctype: this.filterControls.doctype ? this.filterControls.doctype.get_value() : null,
        status: this.filterControls.status ? this.filterControls.status.get_value() : null,
      };
    }

    refresh() {
      if (!this.customer || this._is_loading) {
        return;
      }

      const filters = this.get_filter_values();
      this.show_loading_state(true);

      frappe.call({
        method: 'erpnext_app.kaj_gcmc_compliance.api.dashboard.get_dashboard_data',
        args: {
          customer: this.customer,
          filters,
        },
        freeze: false,
        callback: (response) => {
          this.show_loading_state(false);
          if (response && response.message) {
            this.render(response.message);
          }
        },
        error: () => {
          this.show_loading_state(false);
          this.render(null);
        },
      });
    }

    show_loading_state(isLoading) {
      this._is_loading = Boolean(isLoading);
      this.wrapper.toggleClass('is-loading', this._is_loading);
    }

    render(data) {
      if (!data) {
        Object.values(this.metricElements).forEach(($el) => $el && $el.text('-'));
        this.render_charts({}, true);
        this.render_timeline([]);
        this.render_profile(null);
        return;
      }

      this.update_summary(data.summary || {});
      this.render_charts(data, false);
      this.render_timeline(data.audit_timeline || []);
      this.render_profile(data.profile || {});
      this.update_filter_options(data);
    }

    update_summary(summary) {
      const formatMetric = (value, key) => {
        if (value === null || value === undefined || value === '') {
          return '-';
        }
        if (key === 'compliance_health_score') {
          return `${value}%`;
        }
        return value;
      };

      Object.keys(this.metricElements).forEach((key) => {
        const $el = this.metricElements[key];
        if (!$el) {
          return;
        }
        $el.text(formatMetric(summary[key], key));
      });
    }

    render_charts(data, reset = false) {
      if (reset) {
        Object.values(this.charts).forEach((chart) => chart && chart.update && chart.update({ labels: [], datasets: [{ values: [] }] }));
        return;
      }

      const documentStats = data.document_stats || {};
      const filingStats = data.filing_stats || {};
      const compliance = data.compliance_health || {};

      this.render_chart('document_types', documentStats.document_types, 'pie');
      this.render_chart('filed_forms', filingStats.filed_form_types, 'pie');
      this.render_chart('compliance_status', compliance.area_breakdown, 'pie');
      this.render_chart('filing_trends', filingStats.filing_trends, 'line');
      this.render_chart('upload_activity', documentStats.document_upload_activity, 'bar');
      this.render_chart('expiry_timeline', documentStats.compliance_expiry_timeline, 'line');
    }

    render_chart(key, chartData, chartType) {
      if (!this.chartRegions[key]) {
        return;
      }

      const data = chartData || { labels: [], datasets: [{ values: [] }] };
      const type = chartType || 'line';

      if (!this.charts[key]) {
        this.charts[key] = new frappe.Chart(this.chartRegions[key], {
          type,
          data,
          height: 260,
          colors: ['#4466ff', '#7cd6fd', '#ffa3ef', '#ffc952', '#ff7473'],
          axisOptions: {
            xAxisMode: 'tick',
            yAxisMode: 'tick',
            shortenYAxisNumbers: true,
          },
        });
        return;
      }

      try {
        this.charts[key].update(data);
      } catch (err) {
        // Chart may not yet exist in DOM; recreate it.
        this.chartRegions[key].innerHTML = '';
        this.charts[key] = new frappe.Chart(this.chartRegions[key], {
          type,
          data,
          height: 260,
          colors: ['#4466ff', '#7cd6fd', '#ffa3ef', '#ffc952', '#ff7473'],
        });
      }
    }

    render_timeline(entries) {
      const $region = this.timelineRegion;
      if (!$region) {
        return;
      }

      $region.empty();
      if (!entries || !entries.length) {
        $region.append(`<div class="empty-state">${__('No audit activity recorded yet.')}</div>`);
        return;
      }

      entries.forEach((row) => {
        const payload = row.payload ? `<pre class="timeline-payload">${frappe.utils.escape_html(JSON.stringify(row.payload, null, 2))}</pre>` : '';
        const itemHtml = `
          <div class="timeline-row">
            <div class="timeline-meta">
              <div class="timeline-timestamp">${row.timestamp || ''}</div>
              <div class="timeline-user">${row.user || ''}</div>
            </div>
            <div class="timeline-action">${row.action || ''}</div>
            ${payload}
          </div>
        `;
        $region.append(itemHtml);
      });
    }

    render_profile(profile) {
      const $region = this.profileRegion;
      if (!$region) {
        return;
      }

      $region.empty();
      if (!profile) {
        $region.append(`<div class="empty-state">${__('Select a customer to view the profile.')}</div>`);
        return;
      }

      const rows = [
        { label: __('Customer'), value: profile.customer_name },
        { label: __('Customer ID'), value: profile.customer_id },
        { label: __('Business Registration'), value: profile.business_registration_number },
        { label: __('TIN'), value: profile.tin },
        { label: __('NIS'), value: profile.nis },
        { label: __('Business Type'), value: profile.business_type },
        { label: __('Business Sector'), value: profile.business_sector },
        { label: __('Assigned Staff'), value: profile.assigned_staff },
        { label: __('Cabinet ID'), value: profile.cabinet_id },
        { label: __('Digital Folder'), value: profile.digital_folder_path },
        { label: __('Risk Flags'), value: profile.risk_flags },
      ];

      const profileHtml = rows
        .map(
          (row) => `
            <div class="profile-row">
              <div class="profile-label">${row.label}</div>
              <div class="profile-value">${
                row.value !== undefined && row.value !== null && row.value !== ''
                  ? frappe.utils.escape_html(String(row.value))
                  : '-'
              }</div>
            </div>
          `
        )
        .join('');

      $region.append(profileHtml);
    }

    update_filter_options(data) {
      const documentStats = data.document_stats || {};
      const filingStats = data.filing_stats || {};

      if (this.filterControls.doctype) {
        const docOptions = [''].concat(documentStats.available_types || []);
        const current = this.filterControls.doctype.get_value();
        this.filterControls.doctype.df.options = docOptions.join('\n');
        this.filterControls.doctype.refresh();
        if (current && docOptions.includes(current)) {
          this.filterControls.doctype.set_value(current);
        }
      }

      if (this.filterControls.status) {
        const statusSources = [];
        if (documentStats.available_statuses) {
          statusSources.push(...documentStats.available_statuses);
        }
        const uniqueStatuses = [''].concat([...new Set(statusSources)]);
        const currentStatus = this.filterControls.status.get_value();
        this.filterControls.status.df.options = uniqueStatuses.join('\n');
        this.filterControls.status.refresh();
        if (currentStatus && uniqueStatuses.includes(currentStatus)) {
          this.filterControls.status.set_value(currentStatus);
        }
      }

      if (this.filterControls.year && filingStats.available_years && filingStats.available_years.length) {
        const availableYears = [''].concat(filingStats.available_years.map((year) => String(year)));
        const currentYear = this.filterControls.year.get_value();
        this.filterControls.year.df.options = availableYears.join('\n');
        this.filterControls.year.refresh();
        if (currentYear && availableYears.includes(currentYear)) {
          this.filterControls.year.set_value(currentYear);
        }
      }
    }

    show_pending() {
      this.render(null);
    }
  }

  kaj_gcmc_compliance.dashboard.ClientDashboard = ClientComplianceDashboard;

  class ClientCompliancePage {
    constructor(wrapper) {
      this.wrapper = wrapper;
      this.page = frappe.ui.make_app_page({
        parent: wrapper,
        title: __('Client Compliance Overview'),
        single_column: true,
      });

      this.dashboard = new ClientComplianceDashboard({
        wrapper: this.page.main,
        page: this.page,
      });
    }
  }

  frappe.pages['client-compliance-overview'] = {
    on_page_load: function (wrapper) {
      if (!wrapper.dashboard) {
        wrapper.dashboard = new ClientCompliancePage(wrapper);
      }
    },
    on_page_show: function (wrapper) {
      if (wrapper.dashboard && wrapper.dashboard.dashboard && wrapper.dashboard.dashboard.customer) {
        wrapper.dashboard.dashboard.refresh();
      }
    },
  };

  function ensure_customer_tab(frm) {
    if (frm.is_new && frm.is_new()) {
      if (frm.custom_client_dashboard) {
        frm.custom_client_dashboard.show_pending();
      }
      return;
    }

    if (!frm.doc || !frm.doc.name) {
      return;
    }

    if (!frm.custom_client_dashboard) {
      let tabWrapper = null;

      if (frm.add_custom_tab) {
        tabWrapper = frm.add_custom_tab(__('Client Dashboard'));
      } else if (frm.tab_manager && frm.tab_manager.add_tab) {
        const tab = frm.tab_manager.add_tab(__('Client Dashboard'));
        tabWrapper = tab && tab[0] ? tab[0] : tab;
      }

      if (!tabWrapper) {
        const fallback = $('<div class="client-dashboard-legacy-tab"></div>').appendTo(frm.wrapper.find('.layout-main-section'));
        tabWrapper = fallback.get(0);
        frappe.msgprint({
          title: __('Client Dashboard'),
          indicator: 'blue',
          message: __('Custom tab APIs were not found; the dashboard has been added to the Additional Info section.'),
        });
      }

      const container = $('<div class="client-dashboard-tab-content"></div>').appendTo($(tabWrapper));

      frm.custom_client_dashboard = new ClientComplianceDashboard({
        wrapper: container.get(0),
        customer: frm.doc.name,
        hide_customer_filter: true,
        for_form: true,
      });
    } else {
      frm.custom_client_dashboard.set_customer(frm.doc.name);
    }
  }

  frappe.ui.form.on('Customer', {
    refresh(frm) {
      ensure_customer_tab(frm);
    },
    after_save(frm) {
      if (frm.custom_client_dashboard) {
        frm.custom_client_dashboard.set_customer(frm.doc.name);
      }
    },
  });
})();

