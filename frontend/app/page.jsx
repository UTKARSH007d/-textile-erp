"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, Factory, FileText, LayoutDashboard, Package, ShoppingCart, Truck, Users, Warehouse, CreditCard, ClipboardCheck, Palette, Search, Settings, LogOut, AlertTriangle, TrendingUp, TrendingDown, Bot, Menu, RefreshCw, X, CircleAlert, } from "lucide-react";
const API_URL = "http://127.0.0.1:8000";
const emptyDashboardData = {
    customers: [],
    salesOrders: [],
    productionOrders: [],
    inventory: [],
    dispatches: [],
    invoices: [],
    payments: [],
    products: [],
    yarns: [],
    fabrics: [],
    warehouses: [],
};
function toArray(data) {
    if (Array.isArray(data))
        return data;
    if (Array.isArray(data?.items))
        return data.items;
    if (Array.isArray(data?.data))
        return data.data;
    if (Array.isArray(data?.results))
        return data.results;
    return [];
}
function getAuthToken() {
    if (typeof window === "undefined")
        return null;
    return (localStorage.getItem("textile_erp_token") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token"));
}
async function fetchJSON(url) {
    const token = getAuthToken();
    const response = await fetch(url, {
        cache: "no-store",
        headers: token
            ? {
                Authorization: `Bearer ${token}`,
            }
            : {},
    });
    if (response.status === 401) {
        if (typeof window !== "undefined") {
            localStorage.removeItem("textile_erp_token");
            localStorage.removeItem("access_token");
            localStorage.removeItem("token");
            localStorage.removeItem("textile_erp_user");
            localStorage.removeItem("user");
            window.location.href = "/login";
        }
        throw new Error("Authentication required.");
    }
    if (!response.ok) {
        let detail = "";
        try {
            const errorData = await response.json();
            detail = errorData?.detail || "";
        }
        catch {
            // Ignore non-JSON error responses.
        }
        throw new Error(detail ||
            `Request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return toArray(data);
}
function getNumber(record, keys) {
    for (const key of keys) {
        const value = record?.[key];
        if (value !== undefined &&
            value !== null &&
            value !== "" &&
            !Number.isNaN(Number(value))) {
            return Number(value);
        }
    }
    return 0;
}
function getString(record, keys, fallback = "") {
    for (const key of keys) {
        const value = record?.[key];
        if (value !== undefined &&
            value !== null &&
            String(value).trim() !== "") {
            return String(value);
        }
    }
    return fallback;
}
function normalizeStatus(status) {
    return String(status || "")
        .trim()
        .toLowerCase();
}
function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(Number(amount || 0));
}
function formatCompactCurrency(amount) {
    const value = Number(amount || 0);
    if (value >= 10000000) {
        return `₹${(value / 10000000).toFixed(1)}Cr`;
    }
    if (value >= 100000) {
        return `₹${(value / 100000).toFixed(1)}L`;
    }
    if (value >= 1000) {
        return `₹${(value / 1000).toFixed(1)}K`;
    }
    return `₹${Math.round(value)}`;
}
function formatNumber(value) {
    return new Intl.NumberFormat("en-IN", {
        maximumFractionDigits: 2,
    }).format(Number(value || 0));
}
function formatDate(date) {
    if (!date)
        return "-";
    const parsed = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
        return String(date);
    }
    return parsed.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}
function getToday() {
    return new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12)
        return "Good morning";
    if (hour < 17)
        return "Good afternoon";
    return "Good evening";
}
function getMonthKey(date) {
    if (!date)
        return null;
    const parsed = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
}
function getMonthLabel(date) {
    return date.toLocaleDateString("en-IN", {
        month: "short",
    });
}
function statusClass(status) {
    const normalized = normalizeStatus(status);
    if (normalized.includes("complete") ||
        normalized === "completed" ||
        normalized === "ready" ||
        normalized === "delivered" ||
        normalized === "paid") {
        return "bg-emerald-50 text-emerald-700";
    }
    if (normalized.includes("progress") ||
        normalized.includes("production")) {
        return "bg-blue-50 text-blue-700";
    }
    if (normalized.includes("quality") ||
        normalized.includes("partial") ||
        normalized.includes("pending")) {
        return "bg-amber-50 text-amber-700";
    }
    if (normalized.includes("cancel") ||
        normalized.includes("reject") ||
        normalized.includes("overdue")) {
        return "bg-red-50 text-red-700";
    }
    return "bg-slate-100 text-slate-700";
}
function getProductName(productId, products) {
    if (!productId)
        return "-";
    const product = products.find((item) => String(item.id) === String(productId));
    if (!product) {
        return `Product #${productId}`;
    }
    const code = getString(product, [
        "product_code",
        "code",
    ]);
    const name = getString(product, [
        "name",
        "product_name",
    ]);
    if (code && name)
        return `${code} - ${name}`;
    return name || code || `Product #${productId}`;
}
function getYarnName(yarnId, yarns) {
    if (!yarnId)
        return "-";
    const yarn = yarns.find((item) => String(item.id) === String(yarnId));
    if (!yarn) {
        return `Yarn #${yarnId}`;
    }
    const code = getString(yarn, [
        "yarn_code",
        "code",
    ]);
    const name = getString(yarn, [
        "name",
        "yarn_name",
    ]);
    if (code && name)
        return `${code} - ${name}`;
    return name || code || `Yarn #${yarnId}`;
}
function getFabricName(fabricId, fabrics) {
    if (!fabricId)
        return "-";
    const fabric = fabrics.find((item) => String(item.id) === String(fabricId));
    if (!fabric) {
        return `Fabric #${fabricId}`;
    }
    const code = getString(fabric, [
        "fabric_code",
        "code",
    ]);
    const name = getString(fabric, [
        "name",
        "fabric_name",
    ]);
    if (code && name)
        return `${code} - ${name}`;
    return name || code || `Fabric #${fabricId}`;
}
function getInventoryName(item, data) {
    const directName = getString(item, [
        "item_name",
        "name",
        "inventory_name",
        "description",
    ]);
    if (directName)
        return directName;
    const productId = getNumber(item, [
        "product_id",
    ]);
    if (productId) {
        return getProductName(productId, data.products);
    }
    const yarnId = getNumber(item, [
        "yarn_id",
    ]);
    if (yarnId) {
        return getYarnName(yarnId, data.yarns);
    }
    const fabricId = getNumber(item, [
        "fabric_id",
    ]);
    if (fabricId) {
        return getFabricName(fabricId, data.fabrics);
    }
    return "Inventory Item";
}
function getInventoryQuantity(item) {
    return getNumber(item, [
        "quantity",
        "stock_quantity",
        "current_quantity",
        "available_quantity",
        "available_stock",
        "stock",
        "balance",
    ]);
}
function getInventoryUnit(item) {
    return getString(item, [
        "unit",
        "uom",
        "unit_of_measure",
    ], "units");
}
function getReorderLevel(item) {
    const keys = [
        "reorder_level",
        "reorder_point",
        "minimum_stock",
        "minimum_quantity",
        "min_stock",
        "min_quantity",
    ];
    for (const key of keys) {
        if (item?.[key] !== undefined &&
            item?.[key] !== null &&
            item?.[key] !== "" &&
            !Number.isNaN(Number(item[key]))) {
            return Number(item[key]);
        }
    }
    return null;
}
function getCustomerName(customerId, customers) {
    if (!customerId)
        return "-";
    const customer = customers.find((item) => String(item.id) === String(customerId));
    if (!customer) {
        return `Customer #${customerId}`;
    }
    return getString(customer, [
        "customer_name",
        "name",
        "company_name",
    ], `Customer #${customerId}`);
}
function getOrderNumber(order) {
    return getString(order, [
        "sales_order_no",
        "order_no",
        "sales_order_number",
    ], `SO-${order.id ?? ""}`);
}
function getOrderQuantity(order) {
    return getNumber(order, [
        "quantity",
        "total_quantity",
        "ordered_quantity",
    ]);
}
function normalizeRole(role) {
    return String(role || "")
        .trim()
        .toLowerCase();
}
export default function Dashboard() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState(null);
    const [authReady, setAuthReady] = useState(false);
    const [dashboardData, setDashboardData] = useState(emptyDashboardData);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [chartRange, setChartRange] = useState("6");
    const userRole = normalizeRole(currentUser?.role);
    const isAdmin = userRole === "admin";
    const isManager = userRole === "manager";
    const isEmployee = userRole === "employee";
    const canViewManagementData = isAdmin || isManager;
    useEffect(() => {
        let cancelled = false;
        const loadCurrentUser = async () => {
            const token = getAuthToken();
            if (!token) {
                router.replace("/login");
                return;
            }
            try {
                const response = await fetch(`${API_URL}/api/auth/me`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    cache: "no-store",
                });
                if (!response.ok) {
                    throw new Error("Unable to validate the current session.");
                }
                const data = await response.json();
                const user = data?.user || data;
                if (!user?.role) {
                    throw new Error("The logged-in user has no role.");
                }
                if (!cancelled) {
                    setCurrentUser(user);
                    localStorage.setItem("textile_erp_user", JSON.stringify(user));
                    setAuthReady(true);
                }
            }
            catch (error) {
                console.error("Authentication check failed:", error);
                if (!cancelled) {
                    localStorage.removeItem("textile_erp_token");
                    localStorage.removeItem("access_token");
                    localStorage.removeItem("token");
                    localStorage.removeItem("textile_erp_user");
                    localStorage.removeItem("user");
                    router.replace("/login");
                }
            }
        };
        loadCurrentUser();
        return () => {
            cancelled = true;
        };
    }, [router]);
    const handleLogout = () => {
        localStorage.removeItem("textile_erp_token");
        localStorage.removeItem("access_token");
        localStorage.removeItem("token");
        localStorage.removeItem("textile_erp_user");
        localStorage.removeItem("user");
        router.replace("/login");
    };
    const loadDashboard = useCallback(async (isRefresh = false) => {
        if (!authReady || !currentUser)
            return;
        try {
            if (isRefresh) {
                setRefreshing(true);
            }
            else {
                setLoading(true);
            }
            setError("");
            const requests = canViewManagementData
                ? [
                    fetchJSON(`${API_URL}/api/customers/`),
                    fetchJSON(`${API_URL}/api/sales/orders/`),
                    fetchJSON(`${API_URL}/api/production/`),
                    fetchJSON(`${API_URL}/api/inventory/`),
                    fetchJSON(`${API_URL}/api/finance/invoices`),
                    fetchJSON(`${API_URL}/api/finance/payments`),
                    fetchJSON(`${API_URL}/api/products/`),
                    fetchJSON(`${API_URL}/api/yarns/`),
                    fetchJSON(`${API_URL}/api/fabrics/`),
                    fetchJSON(`${API_URL}/api/warehouses/`),
                ]
                : [
                    fetchJSON(`${API_URL}/api/production/`),
                    fetchJSON(`${API_URL}/api/inventory/`),
                    fetchJSON(`${API_URL}/api/dispatch/`),
                ];
            const results = await Promise.allSettled(requests);
            const getResult = (index) => {
                const result = results[index];
                if (result?.status === "fulfilled") {
                    return result.value;
                }
                return [];
            };
            const nextData = canViewManagementData
                ? {
                    customers: getResult(0),
                    salesOrders: getResult(1),
                    productionOrders: getResult(2),
                    inventory: getResult(3),
                    dispatches: [],
                    invoices: getResult(4),
                    payments: getResult(5),
                    products: getResult(6),
                    yarns: getResult(7),
                    fabrics: getResult(8),
                    warehouses: getResult(9),
                }
                : {
                    customers: [],
                    salesOrders: [],
                    productionOrders: getResult(0),
                    inventory: getResult(1),
                    dispatches: getResult(2),
                    invoices: [],
                    payments: [],
                    products: [],
                    yarns: [],
                    fabrics: [],
                    warehouses: [],
                };
            setDashboardData(nextData);
            const failedRequiredRequest = results.some((result) => result.status === "rejected");
            if (failedRequiredRequest) {
                setError("Some dashboard data could not be loaded. Please check that the backend is running and that your role has access to the requested data.");
            }
        }
        catch (err) {
            console.error("Dashboard loading error:", err);
            setError("Unable to load dashboard data. Please check that the backend server is running.");
        }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [authReady, currentUser, canViewManagementData]);
    useEffect(() => {
        if (authReady && currentUser) {
            loadDashboard();
        }
    }, [authReady, currentUser, loadDashboard]);
    const { customers, salesOrders, productionOrders, inventory, dispatches, invoices, payments, products, yarns, fabrics, warehouses, } = dashboardData;
    /*
     * =========================================================
     * DASHBOARD CALCULATIONS
     * =========================================================
     */
    const pendingSalesOrders = useMemo(() => {
        return salesOrders.filter((order) => {
            const status = normalizeStatus(order.status);
            return (status !== "completed" &&
                status !== "cancelled" &&
                status !== "canceled" &&
                status !== "delivered" &&
                status !== "closed");
        }).length;
    }, [salesOrders]);
    const productionPercentage = useMemo(() => {
        if (!productionOrders.length)
            return 0;
        let planned = 0;
        let produced = 0;
        productionOrders.forEach((order) => {
            planned += getNumber(order, [
                "planned_quantity",
            ]);
            produced += getNumber(order, [
                "produced_quantity",
            ]);
        });
        if (planned <= 0) {
            const completed = productionOrders.filter((order) => normalizeStatus(order.status) ===
                "completed").length;
            return Math.round((completed / productionOrders.length) * 100);
        }
        return Math.min(100, Math.round((produced / planned) * 100));
    }, [productionOrders]);
    const lowStockItems = useMemo(() => {
        return inventory
            .map((item) => {
            const quantity = getInventoryQuantity(item);
            const reorderLevel = getReorderLevel(item);
            let isLowStock = false;
            if (reorderLevel !== null) {
                isLowStock = quantity <= reorderLevel;
            }
            else {
                // If the backend does not expose a reorder
                // level, only zero/negative stock is considered
                // definitively critical.
                isLowStock = quantity <= 0;
            }
            return {
                item,
                quantity,
                reorderLevel,
                isLowStock,
            };
        })
            .filter((entry) => entry.isLowStock)
            .sort((a, b) => {
            if (a.reorderLevel !== null &&
                b.reorderLevel !== null) {
                const aRatio = a.reorderLevel > 0
                    ? a.quantity / a.reorderLevel
                    : a.quantity;
                const bRatio = b.reorderLevel > 0
                    ? b.quantity / b.reorderLevel
                    : b.quantity;
                return aRatio - bRatio;
            }
            return a.quantity - b.quantity;
        });
    }, [inventory]);
    const pendingDispatches = useMemo(() => {
        return dispatches.filter((dispatch) => {
            const status = normalizeStatus(dispatch.status);
            return status === "pending";
        }).length;
    }, [dispatches]);
    const dispatchedCount = useMemo(() => {
        return dispatches.filter((dispatch) => {
            const status = normalizeStatus(dispatch.status);
            return status === "dispatched";
        }).length;
    }, [dispatches]);
    const deliveredDispatches = useMemo(() => {
        return dispatches.filter((dispatch) => {
            const status = normalizeStatus(dispatch.status);
            return status === "delivered";
        }).length;
    }, [dispatches]);
    const totalStockQuantity = useMemo(() => {
        return inventory.reduce((total, item) => total + getNumber(item, ["quantity"]), 0);
    }, [inventory]);

    const outstandingAmount = useMemo(() => {
        const paymentsByInvoice = payments.reduce((accumulator, payment) => {
            const invoiceId = String(payment.invoice_id ?? "");
            if (!invoiceId)
                return accumulator;
            accumulator[invoiceId] =
                (accumulator[invoiceId] || 0) +
                    getNumber(payment, ["amount"]);
            return accumulator;
        }, {});
        return invoices.reduce((total, invoice) => {
            const invoiceTotal = getNumber(invoice, [
                "total_amount",
                "amount",
            ]);
            const paid = paymentsByInvoice[String(invoice.id)] ||
                0;
            return (total +
                Math.max(invoiceTotal - paid, 0));
        }, 0);
    }, [invoices, payments]);
    const overdueInvoices = useMemo(() => {
        const today = new Date();
        return invoices.filter((invoice) => {
            const status = normalizeStatus(invoice.status);
            if (status === "paid" ||
                status === "completed" ||
                status === "cancelled" ||
                status === "canceled") {
                return false;
            }
            const dueDate = invoice.due_date;
            if (!dueDate)
                return false;
            const date = new Date(`${dueDate}T00:00:00`);
            return (!Number.isNaN(date.getTime()) &&
                date < today);
        }).length;
    }, [invoices]);
    const recentOrders = useMemo(() => {
        return [...salesOrders]
            .sort((a, b) => {
            const aId = getNumber(a, ["id"]);
            const bId = getNumber(b, ["id"]);
            if (aId && bId) {
                return bId - aId;
            }
            const aDate = new Date(`${a.order_date || "1970-01-01"}T00:00:00`).getTime();
            const bDate = new Date(`${b.order_date || "1970-01-01"}T00:00:00`).getTime();
            return bDate - aDate;
        })
            .slice(0, 5);
    }, [salesOrders]);
    const chartData = useMemo(() => {
        const months = Number(chartRange);
        const result = [];
        const now = new Date();
        for (let offset = months - 1; offset >= 0; offset--) {
            const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            let sales = 0;
            let production = 0;
            salesOrders.forEach((order) => {
                if (getMonthKey(order.order_date) === key) {
                    sales += getNumber(order, [
                        "total_amount",
                        "amount",
                    ]);
                }
            });
            productionOrders.forEach((order) => {
                const dateValue = order.actual_completion_date ||
                    order.start_date ||
                    order.expected_completion_date;
                if (getMonthKey(dateValue) === key) {
                    production += getNumber(order, [
                        "produced_quantity",
                        "planned_quantity",
                    ]);
                }
            });
            result.push({
                label: getMonthLabel(date),
                sales,
                production,
                salesNormalized: 0,
                productionNormalized: 0,
            });
        }
        const maxSales = Math.max(...result.map((item) => item.sales), 0);
        const maxProduction = Math.max(...result.map((item) => item.production), 0);
        return result.map((item) => ({
            ...item,
            salesNormalized: maxSales > 0
                ? Math.max(8, Math.round((item.sales / maxSales) * 100))
                : 0,
            productionNormalized: maxProduction > 0
                ? Math.max(8, Math.round((item.production /
                    maxProduction) *
                    100))
                : 0,
        }));
    }, [
        chartRange,
        salesOrders,
        productionOrders,
    ]);
    const aiInsight = useMemo(() => {
        const insights = [];

        if (isEmployee) {
            if (lowStockItems.length > 0) {
                insights.push(`${lowStockItems.length} inventory ${lowStockItems.length === 1 ? "item is" : "items are"} currently below the available reorder threshold.`);
            }
            if (pendingDispatches > 0) {
                insights.push(`${pendingDispatches} dispatch ${pendingDispatches === 1 ? "is" : "are"} currently pending.`);
            }
            if (productionOrders.length > 0) {
                insights.push(`Current production completion is approximately ${productionPercentage}%.`);
            }
            if (!insights.length) {
                return "Your operational dashboard currently has no major alerts.";
            }
            return insights.slice(0, 2).join(" ");
        }

        if (lowStockItems.length > 0) {
            insights.push(`${lowStockItems.length} inventory ${lowStockItems.length === 1 ? "item is" : "items are"} currently below the available reorder threshold.`);
        }
        if (pendingSalesOrders > 0) {
            insights.push(`${pendingSalesOrders} sales ${pendingSalesOrders === 1 ? "order is" : "orders are"} still open and require follow-up.`);
        }
        if (overdueInvoices > 0) {
            insights.push(`${overdueInvoices} ${overdueInvoices === 1 ? "invoice is" : "invoices are"} past the recorded due date.`);
        }
        if (productionOrders.length > 0) {
            insights.push(`Current production completion is approximately ${productionPercentage}%.`);
        }
        if (!insights.length) {
            return "Your ERP currently has no major operational alerts based on the available records.";
        }
        return insights.slice(0, 2).join(" ");
    }, [
        isEmployee,
        lowStockItems,
        pendingSalesOrders,
        pendingDispatches,
        overdueInvoices,
        productionOrders,
        productionPercentage,
    ]);
    const stats = isEmployee
        ? [
            {
                title: "Production",
                value: loading ? "—" : `${productionPercentage}%`,
                change: `${productionOrders.length} orders`,
                trend: productionPercentage >= 50 ? "up" : "down",
                icon: Factory,
                onClick: () => router.push("/production"),
            },
            {
                title: "Low Stock Items",
                value: loading ? "—" : formatNumber(lowStockItems.length),
                change: lowStockItems.length > 0 ? "Needs attention" : "Stock levels OK",
                trend: lowStockItems.length > 0 ? "up" : "down",
                icon: Package,
                onClick: () => router.push("/inventory"),
            },
            {
                title: "Available Stock",
                value: loading ? "—" : formatNumber(totalStockQuantity),
                change: `${inventory.length} stock records`,
                trend: "down",
                icon: Warehouse,
                onClick: () => router.push("/inventory"),
            },
            {
                title: "Pending Dispatch",
                value: loading ? "—" : formatNumber(pendingDispatches),
                change: `${dispatchedCount} dispatched`,
                trend: pendingDispatches > 0 ? "up" : "down",
                icon: Truck,
                onClick: () => router.push("/dispatch"),
            },
        ]
        : [
            {
                title: "Sales Orders",
                value: loading ? "—" : formatNumber(salesOrders.length),
                change: `${pendingSalesOrders} pending`,
                trend: pendingSalesOrders > 0 ? "up" : "down",
                icon: ShoppingCart,
                onClick: () => router.push("/sales"),
            },
            {
                title: "Production",
                value: loading ? "—" : `${productionPercentage}%`,
                change: `${productionOrders.length} orders`,
                trend: productionPercentage >= 50 ? "up" : "down",
                icon: Factory,
                onClick: () => router.push("/production"),
            },
            {
                title: "Low Stock Items",
                value: loading ? "—" : formatNumber(lowStockItems.length),
                change: lowStockItems.length > 0 ? "Needs attention" : "Stock levels OK",
                trend: lowStockItems.length > 0 ? "up" : "down",
                icon: Package,
                onClick: () => router.push("/inventory"),
            },
            {
                title: "Outstanding",
                value: loading ? "—" : formatCompactCurrency(outstandingAmount),
                change: overdueInvoices > 0 ? `${overdueInvoices} overdue` : "No overdue invoices",
                trend: overdueInvoices > 0 ? "up" : "down",
                icon: CreditCard,
                onClick: () => router.push("/invoices"),
            },
        ];
    if (!authReady || !currentUser) {
        return (<div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900"/>
          <p className="mt-3 text-sm font-medium text-slate-600">
            Verifying your session...
          </p>
        </div>
      </div>);
    }
    return (<div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">

        {/* =====================================================
            MOBILE MENU
        ====================================================== */}

        {mobileMenuOpen && (<div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/30" onClick={() => setMobileMenuOpen(false)}/>

            <aside className="relative flex h-full w-72 flex-col bg-white shadow-xl">
              <div className="flex h-20 items-center justify-between border-b border-slate-200 px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <Factory size={21}/>
                  </div>

                  <div>
                    <h1 className="text-lg font-bold tracking-tight">
                      TextileERP
                    </h1>

                    <p className="text-xs text-slate-500">
                      Manufacturing Suite
                    </p>
                  </div>
                </div>

                <button onClick={() => setMobileMenuOpen(false)} className="rounded-lg p-2 hover:bg-slate-100">
                  <X size={20}/>
                </button>
              </div>

              <nav className="flex-1 space-y-7 overflow-y-auto px-4 py-6">
                <MobileNavigation router={router} closeMenu={() => setMobileMenuOpen(false)} canViewManagementData={canViewManagementData}/>
              </nav>

              <div className="border-t border-slate-200 p-4">
                <SidebarItem icon={Settings} label="Settings"/>

                <SidebarItem icon={LogOut} label="Logout" onClick={handleLogout}/>
              </div>
            </aside>
          </div>)}

        {/* =====================================================
            DESKTOP SIDEBAR
        ====================================================== */}

        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="flex h-20 items-center border-b border-slate-200 px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                <Factory size={21}/>
              </div>

              <div>
                <h1 className="text-lg font-bold tracking-tight">
                  TextileERP
                </h1>

                <p className="text-xs text-slate-500">
                  Manufacturing Suite
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-7 overflow-y-auto px-4 py-6">
            <SidebarSection title="Overview">
              <SidebarItem icon={LayoutDashboard} label="Dashboard" active onClick={() => router.push("/")}/>
            </SidebarSection>

            {canViewManagementData && (<>
                <SidebarSection title="Sales">
                  <SidebarItem icon={FileText} label="Quotations" onClick={() => router.push("/sales")}/>
                  <SidebarItem icon={ShoppingCart} label="Sales Orders" onClick={() => router.push("/sales")}/>
                  <SidebarItem icon={Users} label="Customers" onClick={() => router.push("/customers")}/>
                </SidebarSection>

                <SidebarSection title="Purchase">
                  <SidebarItem icon={Users} label="Suppliers" onClick={() => router.push("/suppliers")}/>
                  <SidebarItem icon={ClipboardCheck} label="Purchase Orders" onClick={() => router.push("/purchase-orders")}/>
                  <SidebarItem icon={Package} label="Goods Receipt" onClick={() => router.push("/goods-receipts")}/>
                </SidebarSection>
              </>)}

            <SidebarSection title="Operations">
              <SidebarItem icon={Factory} label="Production" onClick={() => router.push("/production")}/>
              <SidebarItem icon={Palette} label="Dyeing & Finishing" onClick={() => router.push("/dyeing-finishing")}/>
              <SidebarItem icon={ClipboardCheck} label="Quality" onClick={() => router.push("/quality")}/>
            </SidebarSection>

            <SidebarSection title="Inventory">
              <SidebarItem icon={Warehouse} label="Stock" onClick={() => router.push("/inventory")}/>
              <SidebarItem icon={Package} label="Stock Movements" onClick={() => router.push("/inventory/movements")}/>
            </SidebarSection>

            <SidebarSection title="Finance">
              <SidebarItem icon={Truck} label="Dispatch" onClick={() => router.push("/dispatch")}/>
              {canViewManagementData && (<>
                  <SidebarItem icon={FileText} label="Invoices" onClick={() => router.push("/invoices")}/>
                  <SidebarItem icon={CreditCard} label="Payments" onClick={() => router.push("/payments")}/>
                </>)}
            </SidebarSection>

            <SidebarSection title="Intelligence">
              <SidebarItem icon={Bot} label="AI Assistant" onClick={() => router.push("/assistant")}/>
              {canViewManagementData && (<SidebarItem icon={TrendingUp} label="Reports" onClick={() => router.push("/report")}/>)}
            </SidebarSection>
          </nav>

          <div className="border-t border-slate-200 p-4">
            <SidebarItem icon={Settings} label="Settings"/>

            <SidebarItem icon={LogOut} label="Logout" onClick={handleLogout}/>
          </div>
        </aside>

        {/* =====================================================
            MAIN
        ====================================================== */}

        <main className="min-w-0 flex-1">

          {/* HEADER */}

          <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur lg:px-8">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileMenuOpen(true)} className="rounded-lg p-2 hover:bg-slate-100 lg:hidden">
                <Menu size={21}/>
              </button>

              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  Dashboard
                </h2>

                <p className="text-sm text-slate-500">
                  Overview of your textile operations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">

              <button onClick={() => loadDashboard(true)} disabled={refreshing} title="Refresh dashboard" className="rounded-lg border border-slate-200 bg-white p-2.5 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
                <RefreshCw size={19} className={refreshing
            ? "animate-spin text-slate-600"
            : "text-slate-600"}/>
              </button>

              <button className="hidden rounded-lg border border-slate-200 bg-white p-2.5 hover:bg-slate-50 sm:block">
                <Search size={19} className="text-slate-600"/>
              </button>

              <button className="relative rounded-lg border border-slate-200 bg-white p-2.5 hover:bg-slate-50">
                <Bell size={19} className="text-slate-600"/>

                {(lowStockItems.length > 0 ||
            overdueInvoices > 0) && (<span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500"/>)}
              </button>

              <div className="hidden h-8 w-px bg-slate-200 sm:block"/>

              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                  {currentUser?.full_name
            ?.split(" ")
            .map((name) => name[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "U"}
                </div>

                <div className="hidden sm:block">
                  <p className="text-sm font-semibold">
                    {currentUser?.full_name ||
            currentUser?.username ||
            "User"}
                  </p>

                  <p className="text-xs capitalize text-slate-500">
                    {currentUser?.role || "Employee"}
                  </p>
                </div>

                <ChevronDown size={16} className="hidden text-slate-400 sm:block"/>
              </div>
            </div>
          </header>

          <div className="p-5 lg:p-8">

            {/* ERROR */}

            {error && (<div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <CircleAlert size={18} className="mt-0.5 shrink-0"/>

                <div>
                  <p className="font-semibold">
                    Dashboard data warning
                  </p>

                  <p className="mt-0.5">
                    {error}
                  </p>
                </div>
              </div>)}

            {/* WELCOME */}

            <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="mb-1 text-sm font-medium text-slate-500">
                  {getToday()}
                </p>

                <h3 className="text-2xl font-bold tracking-tight">
                  {getGreeting()}, {currentUser?.full_name || currentUser?.username || "User"} 👋
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Here's what's happening across your
                  manufacturing operations.
                </p>
              </div>

              {canViewManagementData && (
                <button onClick={() => router.push("/sales")} className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
                  <FileText size={17}/>
                  New Sales Order
                </button>
              )}
            </div>

            {/* =================================================
            STATS
        ================================================== */}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => {
            const Icon = stat.icon;
            return (<button key={stat.title} type="button" onClick={stat.onClick} className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500">
                          {stat.title}
                        </p>

                        <p className="mt-2 text-2xl font-bold tracking-tight">
                          {stat.value}
                        </p>
                      </div>

                      <div className="rounded-lg bg-slate-100 p-2.5">
                        <Icon size={20} className="text-slate-700"/>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-1.5 text-xs font-medium">
                      {stat.trend === "up" ? (<TrendingUp size={14} className="text-amber-600"/>) : (<TrendingDown size={14} className="text-emerald-600"/>)}

                      <span className={stat.trend === "up"
                    ? "text-amber-600"
                    : "text-emerald-600"}>
                        {stat.change}
                      </span>

                      <span className="text-slate-400">
                        current
                      </span>
                    </div>
                  </button>);
        })}
            </div>

            {/* =================================================
            OPERATIONS CHART
        ================================================== */}

            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="font-semibold">
                    {isEmployee ? "Production Performance" : "Operations Overview"}
                  </h4>

                  <p className="mt-1 text-sm text-slate-500">
                    {isEmployee
                      ? "Monthly production output"
                      : "Actual sales value and production performance"}
                  </p>
                </div>

                <select value={chartRange} onChange={(event) => setChartRange(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-slate-400">
                  <option value="6">
                    Last 6 months
                  </option>

                  <option value="12">
                    Last 12 months
                  </option>
                </select>
              </div>

              <div className="mt-7 h-72">
                {chartData.every((item) => item.sales === 0 &&
            item.production === 0) ? (<div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200">
                    <div className="text-center">
                      <TrendingUp size={28} className="mx-auto text-slate-300"/>

                      <p className="mt-2 text-sm font-medium text-slate-500">
                        No monthly activity yet
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Production data will appear here automatically.
                      </p>
                    </div>
                  </div>) : (<>
                    <div className="flex h-full gap-5">
                      <div className="flex flex-col justify-between py-2 text-xs text-slate-400">
                        <span>100%</span>
                        <span>75%</span>
                        <span>50%</span>
                        <span>25%</span>
                        <span>0%</span>
                      </div>

                      <div className="relative flex flex-1 items-end justify-between gap-2 border-b border-l border-slate-200 px-2 sm:gap-3 sm:px-4">
                        {chartData.map((item, index) => (<div key={`${item.label}-${index}`} className="flex h-full flex-1 items-end gap-1 sm:gap-1.5">
                              {!isEmployee && (
                                <div title={`Sales: ${formatCurrency(item.sales)}`} className="w-full rounded-t-md bg-slate-900 transition-all" style={{
                                  height: `${item.salesNormalized}%`,
                                }}/>
                              )}

                              <div title={`Production: ${formatNumber(item.production)}`} className="w-full rounded-t-md bg-slate-200 transition-all" style={{
                                height: `${item.productionNormalized}%`,
                              }}/>
                            </div>))}
                      </div>
                    </div>

                    <div className="ml-12 mt-3 flex justify-between text-xs text-slate-400">
                      {chartData.map((item, index) => (<span key={`${item.label}-label-${index}`}>
                            {item.label}
                          </span>))}
                    </div>
                  </>)}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-slate-900"/>
                  Sales
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-slate-200"/>
                  Production
                </div>
              </div>
            </div>

            {/* =================================================
            TABLES
        ================================================== */}

            <div className="mt-6 grid gap-6 xl:grid-cols-2">

              {/* RECENT ORDERS */}

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                  <div>
                    <h4 className="font-semibold">
                      Recent Sales Orders
                    </h4>

                    <p className="mt-1 text-xs text-slate-500">
                      Latest customer orders
                    </p>
                  </div>

                  <button onClick={() => router.push("/sales")} className="text-sm font-medium text-slate-700 hover:underline">
                    View all
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-6 py-3 font-medium">
                          Order
                        </th>

                        <th className="px-6 py-3 font-medium">
                          Customer
                        </th>

                        <th className="px-6 py-3 font-medium">
                          Amount
                        </th>

                        <th className="px-6 py-3 font-medium">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {loading ? (<tr>
                          <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-400">
                            Loading sales orders...
                          </td>
                        </tr>) : recentOrders.length ===
            0 ? (<tr>
                          <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-400">
                            No sales orders found.
                          </td>
                        </tr>) : (recentOrders.map((order) => {
            const amount = getNumber(order, [
                "total_amount",
                "amount",
            ]);
            const quantity = getOrderQuantity(order);
            return (<tr key={order.id ??
                    getOrderNumber(order)} className="hover:bg-slate-50">
                                <td className="px-6 py-4">
                                  <p className="font-semibold">
                                    {getOrderNumber(order)}
                                  </p>

                                  <p className="mt-0.5 text-xs text-slate-400">
                                    {formatDate(order.order_date)}
                                  </p>
                                </td>

                                <td className="px-6 py-4 text-slate-600">
                                  {getCustomerName(order.customer_id, customers)}
                                </td>

                                <td className="px-6 py-4 text-slate-600">
                                  <p className="font-medium">
                                    {formatCurrency(amount)}
                                  </p>

                                  {quantity > 0 && (<p className="mt-0.5 text-xs text-slate-400">
                                      {formatNumber(quantity)}{" "}
                                      qty
                                    </p>)}
                                </td>

                                <td className="px-6 py-4">
                                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(order.status)}`}>
                                    {getString(order, ["status"], "Pending")}
                                  </span>
                                </td>
                              </tr>);
        }))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* LOW STOCK */}

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                  <div>
                    <h4 className="font-semibold">
                      Low Stock Alerts
                    </h4>

                    <p className="mt-1 text-xs text-slate-500">
                      Items below reorder level
                    </p>
                  </div>

                  <div className={`rounded-lg p-2 ${lowStockItems.length > 0
            ? "bg-amber-50"
            : "bg-emerald-50"}`}>
                    <AlertTriangle size={18} className={lowStockItems.length > 0
            ? "text-amber-600"
            : "text-emerald-600"}/>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {loading ? (<div className="px-6 py-10 text-center text-sm text-slate-400">
                      Loading inventory...
                    </div>) : lowStockItems.length ===
            0 ? (<div className="px-6 py-10 text-center">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                        <Package size={19} className="text-emerald-600"/>
                      </div>

                      <p className="mt-3 text-sm font-semibold text-slate-700">
                        No low-stock items
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Current inventory is above the
                        available thresholds.
                      </p>
                    </div>) : (lowStockItems
            .slice(0, 5)
            .map(({ item, quantity, reorderLevel, }) => (<div key={item.id ??
                `${getInventoryName(item, dashboardData)}-${quantity}`} className="flex items-center justify-between px-6 py-4">
                            <div className="min-w-0 pr-4">
                              <p className="truncate text-sm font-semibold">
                                {getInventoryName(item, dashboardData)}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                {reorderLevel !==
                null
                ? `Reorder level: ${formatNumber(reorderLevel)} ${getInventoryUnit(item)}`
                : "Critical stock level"}
                              </p>
                            </div>

                            <div className="shrink-0 text-right">
                              <p className="text-sm font-bold text-red-600">
                                {formatNumber(quantity)}{" "}
                                {getInventoryUnit(item)}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                Available
                              </p>
                            </div>
                          </div>)))}
                </div>

                {lowStockItems.length > 5 && (<div className="border-t border-slate-200 bg-slate-50 px-6 py-3">
                    <p className="text-xs text-slate-500">
                      +{" "}
                      {lowStockItems.length - 5}{" "}
                      more low-stock items
                    </p>
                  </div>)}

                <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
                  <button onClick={() => router.push("/inventory")} className="text-sm font-semibold text-slate-700 hover:underline">
                    View inventory →
                  </button>
                </div>
              </div>
            </div>

            {/* =================================================
            ADDITIONAL BUSINESS SUMMARY
        ================================================== */}

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {isEmployee ? (
                <>
                  <SummaryCard label="Production Orders" value={productionOrders.length} description="Current production records" icon={Factory} onClick={() => router.push("/production")}/>
                  <SummaryCard label="Stock Records" value={inventory.length} description="Available inventory records" icon={Package} onClick={() => router.push("/inventory")}/>
                  <SummaryCard label="Low Stock" value={lowStockItems.length} description="Items needing attention" icon={Warehouse} onClick={() => router.push("/inventory")}/>
                  <SummaryCard label="Dispatches" value={dispatches.length} description={`${pendingDispatches} pending dispatches`} icon={Truck} onClick={() => router.push("/dispatch")}/>
                </>
              ) : (
                <>
                  <SummaryCard label="Customers" value={customers.length} description="Registered customers" icon={Users} onClick={() => router.push("/customers")}/>
                  <SummaryCard label="Products" value={products.length} description="Active product records" icon={Package} onClick={() => router.push("/inventory")}/>
                  <SummaryCard label="Invoices" value={invoices.length} description="Total recorded invoices" icon={FileText} onClick={() => router.push("/invoices")}/>
                  <SummaryCard label="Warehouses" value={warehouses.length} description="Configured warehouses" icon={Warehouse} onClick={() => router.push("/inventory")}/>
                </>
              )}
            </div>

            {/* =================================================
            AI INSIGHT
        ================================================== */}

            <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-900 p-6 text-white shadow-sm">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-white/10 p-3">
                    <Bot size={24}/>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">
                        AI Business Insight
                      </h4>

                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                        Live
                      </span>
                    </div>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                      {aiInsight}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
                      {isEmployee ? (
                        <>
                          <span>Production: {productionPercentage}%</span>
                          <span>Low stock: {lowStockItems.length}</span>
                          <span>Pending dispatch: {pendingDispatches}</span>
                        </>
                      ) : (
                        <>
                          <span>Outstanding: {formatCompactCurrency(outstandingAmount)}</span>
                          <span>Production: {productionPercentage}%</span>
                          <span>Low stock: {lowStockItems.length}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button onClick={() => router.push("/assistant")} className="shrink-0 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100">
                  Ask AI Assistant
                </button>
              </div>
            </div>

            {/* =================================================
            FOOTER STATUS
        ================================================== */}

            <div className="mt-6 flex flex-col justify-between gap-2 text-xs text-slate-400 sm:flex-row">
              <p>
                TextileERP dashboard is connected to
                the live ERP APIs.
              </p>

              <p>
                {loading
            ? "Loading data..."
            : `Last refreshed ${new Date().toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
            })}`}
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>);
}
/* =========================================================
   SUMMARY CARD
========================================================= */
function SummaryCard({ label, value, description, icon: Icon, onClick, }) {
    return (<button type="button" onClick={onClick} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div>
        <p className="text-sm font-medium text-slate-500">
          {label}
        </p>

        <p className="mt-1 text-2xl font-bold tracking-tight">
          {formatNumber(value)}
        </p>

        <p className="mt-1 text-xs text-slate-400">
          {description}
        </p>
      </div>

      <div className="rounded-lg bg-slate-100 p-2.5">
        <Icon size={20} className="text-slate-700"/>
      </div>
    </button>);
}
/* =========================================================
   MOBILE NAVIGATION
========================================================= */
function MobileNavigation({ router, closeMenu, canViewManagementData, }) {
    const navigate = (path) => {
        closeMenu();
        router.push(path);
    };
    return (<>
      <SidebarSection title="Overview">
        <SidebarItem icon={LayoutDashboard} label="Dashboard" active onClick={() => navigate("/")}/>
      </SidebarSection>

      {canViewManagementData && (<>
          <SidebarSection title="Sales">
            <SidebarItem icon={FileText} label="Quotations" onClick={() => navigate("/sales")}/>
            <SidebarItem icon={ShoppingCart} label="Sales Orders" onClick={() => navigate("/sales")}/>
            <SidebarItem icon={Users} label="Customers" onClick={() => navigate("/customers")}/>
          </SidebarSection>

          <SidebarSection title="Purchase">
            <SidebarItem icon={Users} label="Suppliers" onClick={() => navigate("/suppliers")}/>
            <SidebarItem icon={ClipboardCheck} label="Purchase Orders" onClick={() => navigate("/purchase-orders")}/>
            <SidebarItem icon={Package} label="Goods Receipt" onClick={() => navigate("/goods-receipts")}/>
          </SidebarSection>
        </>)}

      <SidebarSection title="Operations">
        <SidebarItem icon={Factory} label="Production" onClick={() => navigate("/production")}/>
        <SidebarItem icon={Palette} label="Dyeing & Finishing" onClick={() => navigate("/dyeing-finishing")}/>
        <SidebarItem icon={ClipboardCheck} label="Quality" onClick={() => navigate("/quality")}/>
      </SidebarSection>

      <SidebarSection title="Inventory">
        <SidebarItem icon={Warehouse} label="Stock" onClick={() => navigate("/inventory")}/>
        <SidebarItem icon={Package} label="Stock Movements" onClick={() => navigate("/inventory/movements")}/>
      </SidebarSection>

      <SidebarSection title="Finance">
        <SidebarItem icon={Truck} label="Dispatch" onClick={() => navigate("/dispatch")}/>
        {canViewManagementData && (<>
            <SidebarItem icon={FileText} label="Invoices" onClick={() => navigate("/invoices")}/>
            <SidebarItem icon={CreditCard} label="Payments" onClick={() => navigate("/payments")}/>
          </>)}
      </SidebarSection>

      <SidebarSection title="Intelligence">
        <SidebarItem icon={Bot} label="AI Assistant" onClick={() => navigate("/assistant")}/>
        {canViewManagementData && (<SidebarItem icon={TrendingUp} label="Reports" onClick={() => navigate("/report")}/>)}
      </SidebarSection>
    </>);
}
/* =========================================================
   SIDEBAR SECTION
========================================================= */
function SidebarSection({ title, children, }) {
    return (<div>
      <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {title}
      </p>

      <div className="space-y-1">
        {children}
      </div>
    </div>);
}
/* =========================================================
   SIDEBAR ITEM
========================================================= */
function SidebarItem({ icon: Icon, label, active = false, onClick, }) {
    return (<button type="button" onClick={onClick} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${active
            ? "bg-slate-900 text-white shadow-sm"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
      <Icon size={17}/>

      <span>{label}</span>
    </button>);
}
