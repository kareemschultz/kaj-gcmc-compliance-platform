frappe.ui.form.on('Customer', {
    refresh(frm) {
        if (frm.is_new()) {
            frm.dashboard.clear_headline();
            return;
        }

        frm.add_custom_button(
            __('Compliance Overview'),
            () => {
                frappe.route_options = { customer: frm.doc.name };
                frappe.set_route('client-compliance-overview');
            },
            __('View')
        );

        frm.trigger('load_compliance_summary');
    },

    after_save(frm) {
        if (!frm.is_new()) {
            frm.trigger('load_compliance_summary');
        }
    },

    load_compliance_summary(frm) {
        if (frm.is_new()) {
            return;
        }

        frm.dashboard.clear_headline();
        frm.dashboard.add_indicator(__('Loading compliance metrics…'), 'orange');

        frappe.call({
            method: 'kaj_gcmc_compliance.api.dashboard.get_dashboard_data',
            args: { customer_id: frm.doc.name },
        })
            .then(({ message }) => {
                const summary = (message || {}).summary || {};
                const score = summary.compliance_health_score;
                const expiring = summary.expiring_within_30_days || 0;
                const nextRenewal = summary.next_renewal_date
                    ? frappe.datetime.str_to_user(summary.next_renewal_date)
                    : __('Not Scheduled');

                frm.dashboard.clear_headline();

                if (typeof score === 'number') {
                    const indicator = score >= 80 ? 'green' : score >= 50 ? 'orange' : 'red';
                    frm.dashboard.add_indicator(
                        __('Compliance Score: {0}%', [score]),
                        indicator
                    );
                } else {
                    frm.dashboard.add_indicator(__('Compliance Score: --'), 'grey');
                }

                frm.dashboard.add_indicator(
                    __('Expiring Within 30 Days: {0}', [expiring]),
                    expiring ? 'orange' : 'green'
                );

                frm.dashboard.add_indicator(
                    __('Next Renewal: {0}', [nextRenewal]),
                    'blue'
                );
            })
            .catch(() => {
                frm.dashboard.clear_headline();
                frm.dashboard.add_indicator(__('Unable to load compliance metrics'), 'red');
            });
    },
});
