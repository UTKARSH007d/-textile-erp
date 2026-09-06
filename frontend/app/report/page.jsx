"use client";

import { apiFetch } from "../lib/api";

import { useEffect, useState } from "react";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function ReportsPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReports = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch(
        `${API_BASE_URL}/api/reports/summary`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load reports");
      }

      const data = await response.json();

      setSummary(data);
    } catch (err) {
      console.error(err);
      setError(
        "Unable to load report data. Please make sure the backend server is running."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const formatCurrency = (value) => {
    return `₹${Number(value || 0).toLocaleString("en-IN")}`;
  };

  const formatNumber = (value) => {
    return Number(value || 0).toLocaleString("en-IN");
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div style={styles.page}>
        <div style={styles.errorContainer}>
          <h2 style={styles.errorTitle}>Unable to load reports</h2>

          <p style={styles.errorText}>
            {error || "Report data is not available."}
          </p>

          <button
            style={styles.retryButton}
            onClick={loadReports}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const reportSections = [
    {
      title: "Sales Performance",
      description: "Overview of quotations and sales orders",
      icon: "🛒",
      items: [
        {
          label: "Total Quotations",
          value: formatNumber(summary.sales?.total_quotations),
        },
        {
          label: "Total Sales Orders",
          value: formatNumber(summary.sales?.total_orders),
        },
        {
          label: "Sales Value",
          value: formatCurrency(summary.sales?.total_value),
        },
        {
          label: "Pending Orders",
          value: formatNumber(summary.sales?.pending_orders),
        },
        {
          label: "Completed Orders",
          value: formatNumber(summary.sales?.completed_orders),
        },
      ],
    },

    {
      title: "Purchase Performance",
      description: "Purchase orders and procurement activity",
      icon: "📦",
      items: [
        {
          label: "Total Purchase Orders",
          value: formatNumber(summary.purchases?.total_orders),
        },
        {
          label: "Purchase Value",
          value: formatCurrency(summary.purchases?.total_value),
        },
        {
          label: "Pending Orders",
          value: formatNumber(summary.purchases?.pending_orders),
        },
        {
          label: "Completed Orders",
          value: formatNumber(summary.purchases?.completed_orders),
        },
        {
          label: "Goods Receipts",
          value: formatNumber(summary.goods_receipts?.total),
        },
      ],
    },

    {
      title: "Production Performance",
      description: "Production progress and completion",
      icon: "🏭",
      items: [
        {
          label: "Total Production Orders",
          value: formatNumber(summary.production?.total_orders),
        },
        {
          label: "Planned Orders",
          value: formatNumber(summary.production?.planned_orders),
        },
        {
          label: "In Progress",
          value: formatNumber(summary.production?.in_progress_orders),
        },
        {
          label: "Completed Orders",
          value: formatNumber(summary.production?.completed_orders),
        },
        {
          label: "Order Completion Rate",
          value: `${summary.production?.completion_rate || 0}%`,
        },
        {
          label: "Quantity Completion",
          value: `${summary.production?.quantity_completion_rate || 0}%`,
        },
      ],
    },

    {
      title: "Inventory Performance",
      description: "Current stock and inventory availability",
      icon: "📊",
      items: [
        {
          label: "Inventory Records",
          value: formatNumber(summary.inventory?.total_records),
        },
        {
          label: "Total Stock Quantity",
          value: formatNumber(summary.inventory?.total_stock_quantity),
        },
        {
          label: "Reserved Quantity",
          value: formatNumber(summary.inventory?.total_reserved_quantity),
        },
        {
          label: "Available Quantity",
          value: formatNumber(summary.inventory?.available_quantity),
        },
        {
          label: "Low Stock Items",
          value: formatNumber(summary.inventory?.low_stock_count),
        },
      ],
    },

    {
      title: "Quality Performance",
      description: "Inspection results and quality analysis",
      icon: "✓",
      items: [
        {
          label: "Total Inspections",
          value: formatNumber(summary.quality?.total_inspections),
        },
        {
          label: "Inspected Quantity",
          value: formatNumber(summary.quality?.inspected_quantity),
        },
        {
          label: "Passed Quantity",
          value: formatNumber(summary.quality?.passed_quantity),
        },
        {
          label: "Rejected Quantity",
          value: formatNumber(summary.quality?.rejected_quantity),
        },
        {
          label: "Pass Rate",
          value: `${summary.quality?.pass_rate || 0}%`,
        },
        {
          label: "Rejection Rate",
          value: `${summary.quality?.rejection_rate || 0}%`,
        },
      ],
    },

    {
      title: "Dispatch Performance",
      description: "Order dispatch and delivery activity",
      icon: "🚚",
      items: [
        {
          label: "Total Dispatches",
          value: formatNumber(summary.dispatch?.total),
        },
        {
          label: "Pending",
          value: formatNumber(summary.dispatch?.pending),
        },
        {
          label: "Dispatched",
          value: formatNumber(summary.dispatch?.dispatched),
        },
        {
          label: "Delivered",
          value: formatNumber(summary.dispatch?.delivered),
        },
        {
          label: "Total Quantity",
          value: formatNumber(summary.dispatch?.total_quantity),
        },
      ],
    },

    {
      title: "Financial Performance",
      description: "Invoices, payments and outstanding amount",
      icon: "₹",
      items: [
        {
          label: "Total Invoices",
          value: formatNumber(summary.finance?.total_invoices),
        },
        {
          label: "Invoice Value",
          value: formatCurrency(summary.finance?.total_invoice_value),
        },
        {
          label: "Payments Received",
          value: formatCurrency(
            summary.finance?.total_payment_received
          ),
        },
        {
          label: "Outstanding Amount",
          value: formatCurrency(summary.finance?.total_outstanding),
          highlight: true,
        },
        {
          label: "Paid Invoices",
          value: formatNumber(summary.finance?.paid_invoices),
        },
        {
          label: "Partial Invoices",
          value: formatNumber(summary.finance?.partial_invoices),
        },
      ],
    },

    {
      title: "Business Overview",
      description: "Customers, suppliers and processing activity",
      icon: "🏢",
      items: [
        {
          label: "Total Customers",
          value: formatNumber(summary.customers?.total),
        },
        {
          label: "Active Customers",
          value: formatNumber(summary.customers?.active),
        },
        {
          label: "Inactive Customers",
          value: formatNumber(summary.customers?.inactive),
        },
        {
          label: "Total Suppliers",
          value: formatNumber(summary.suppliers?.total),
        },
        {
          label: "Dyeing Orders",
          value: formatNumber(summary.processing?.dyeing_orders),
        },
        {
          label: "Finishing Orders",
          value: formatNumber(summary.processing?.finishing_orders),
        },
      ],
    },
  ];

  return (
    <div style={styles.page}>
      {/* HEADER */}

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Reports</h1>

          <p style={styles.subtitle}>
            Business performance and operational insights
          </p>
        </div>

        <button
          onClick={loadReports}
          style={styles.refreshButton}
        >
          ↻ Refresh
        </button>
      </div>

      {/* TOP SUMMARY */}

      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <span style={styles.summaryLabel}>Sales Orders</span>

          <h2 style={styles.summaryValue}>
            {formatNumber(summary.sales?.total_orders)}
          </h2>

          <span style={styles.summarySubtext}>
            {formatCurrency(summary.sales?.total_value)} total value
          </span>
        </div>

        <div style={styles.summaryCard}>
          <span style={styles.summaryLabel}>Production</span>

          <h2 style={styles.summaryValue}>
            {summary.production?.completion_rate || 0}%
          </h2>

          <span style={styles.summarySubtext}>
            {formatNumber(summary.production?.completed_orders)} completed
          </span>
        </div>

        <div style={styles.summaryCard}>
          <span style={styles.summaryLabel}>Inventory</span>

          <h2 style={styles.summaryValue}>
            {formatNumber(summary.inventory?.total_stock_quantity)}
          </h2>

          <span style={styles.summarySubtext}>
            {formatNumber(summary.inventory?.low_stock_count)} low stock items
          </span>
        </div>

        <div style={styles.summaryCard}>
          <span style={styles.summaryLabel}>Outstanding</span>

          <h2 style={styles.summaryValue}>
            {formatCurrency(summary.finance?.total_outstanding)}
          </h2>

          <span style={styles.summarySubtext}>
            {formatNumber(summary.finance?.total_invoices)} invoices
          </span>
        </div>
      </div>

      {/* REPORT SECTIONS */}

      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Detailed Reports</h2>

          <p style={styles.sectionSubtitle}>
            Live data generated from your Textile ERP system
          </p>
        </div>

        <div style={styles.liveBadge}>
          ● LIVE DATA
        </div>
      </div>

      <div style={styles.reportGrid}>
        {reportSections.map((section) => (
          <div
            key={section.title}
            style={styles.reportCard}
          >
            <div style={styles.cardHeader}>
              <div style={styles.iconBox}>
                {section.icon}
              </div>

              <div>
                <h3 style={styles.cardTitle}>
                  {section.title}
                </h3>

                <p style={styles.cardDescription}>
                  {section.description}
                </p>
              </div>
            </div>

            <div style={styles.metricsGrid}>
              {section.items.map((item) => (
                <div
                  key={item.label}
                  style={styles.metric}
                >
                  <span style={styles.metricLabel}>
                    {item.label}
                  </span>

                  <span
                    style={{
                      ...styles.metricValue,
                      ...(item.highlight
                        ? styles.highlightValue
                        : {}),
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER */}

      <div style={styles.footer}>
        <span>
          TextileERP Reports • Connected to live ERP data
        </span>

        <span>
          Last generated:{" "}
          {summary.generated_at
            ? new Date(summary.generated_at).toLocaleString(
                "en-IN"
              )
            : "N/A"}
        </span>
      </div>
    </div>
  );
}


const styles = {
  page: {
    minHeight: "100vh",
    padding: "32px",
    background: "#f5f7fb",
    color: "#1d2939",
    fontFamily: "Arial, sans-serif",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
  },

  title: {
    margin: 0,
    fontSize: "32px",
    fontWeight: "700",
    color: "#182230",
  },

  subtitle: {
    marginTop: "8px",
    marginBottom: 0,
    fontSize: "16px",
    color: "#667085",
  },

  refreshButton: {
    border: "1px solid #d0d5dd",
    background: "#ffffff",
    padding: "11px 18px",
    borderRadius: "9px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    color: "#344054",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
    marginBottom: "36px",
  },

  summaryCard: {
    background: "#ffffff",
    border: "1px solid #e4e7ec",
    borderRadius: "14px",
    padding: "22px",
    boxShadow: "0 2px 6px rgba(16, 24, 40, 0.04)",
  },

  summaryLabel: {
    color: "#667085",
    fontSize: "14px",
  },

  summaryValue: {
    margin: "10px 0 8px",
    fontSize: "28px",
    color: "#182230",
  },

  summarySubtext: {
    color: "#667085",
    fontSize: "13px",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "22px",
    color: "#182230",
  },

  sectionSubtitle: {
    marginTop: "6px",
    marginBottom: 0,
    color: "#667085",
    fontSize: "14px",
  },

  liveBadge: {
    background: "#ecfdf3",
    color: "#027a48",
    fontSize: "12px",
    fontWeight: "700",
    padding: "8px 12px",
    borderRadius: "20px",
  },

  reportGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(420px, 1fr))",
    gap: "20px",
  },

  reportCard: {
    background: "#ffffff",
    border: "1px solid #e4e7ec",
    borderRadius: "14px",
    overflow: "hidden",
    boxShadow: "0 2px 6px rgba(16, 24, 40, 0.04)",
  },

  cardHeader: {
    display: "flex",
    gap: "14px",
    alignItems: "center",
    padding: "20px",
    borderBottom: "1px solid #eaecf0",
  },

  iconBox: {
    width: "44px",
    height: "44px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f2f4f7",
    borderRadius: "10px",
    fontSize: "20px",
  },

  cardTitle: {
    margin: 0,
    fontSize: "17px",
    color: "#182230",
  },

  cardDescription: {
    margin: "5px 0 0",
    fontSize: "13px",
    color: "#667085",
  },

  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
  },

  metric: {
    padding: "16px 20px",
    borderBottom: "1px solid #f2f4f7",
  },

  metricLabel: {
    display: "block",
    fontSize: "12px",
    color: "#667085",
    marginBottom: "6px",
  },

  metricValue: {
    display: "block",
    fontSize: "18px",
    fontWeight: "700",
    color: "#182230",
  },

  highlightValue: {
    color: "#b54708",
  },

  footer: {
    marginTop: "32px",
    padding: "18px 0",
    display: "flex",
    justifyContent: "space-between",
    color: "#98a2b3",
    fontSize: "13px",
    borderTop: "1px solid #e4e7ec",
  },

  loadingContainer: {
    height: "70vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },

  spinner: {
    width: "38px",
    height: "38px",
    border: "4px solid #e4e7ec",
    borderTop: "4px solid #1d2939",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },

  loadingText: {
    marginTop: "16px",
    color: "#667085",
  },

  errorContainer: {
    background: "#ffffff",
    border: "1px solid #fecdca",
    borderRadius: "12px",
    padding: "30px",
    maxWidth: "500px",
    margin: "80px auto",
    textAlign: "center",
  },

  errorTitle: {
    color: "#b42318",
    margin: 0,
  },

  errorText: {
    color: "#667085",
    marginTop: "12px",
  },

  retryButton: {
    marginTop: "15px",
    background: "#1d2939",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "10px 18px",
    cursor: "pointer",
  },
};