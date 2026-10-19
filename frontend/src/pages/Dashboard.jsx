import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CircleAlert,
  Package,
  RefreshCw,
  Tags,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api, toArray } from "../api";
import { useToast } from "../components/Toast";
import PageHeader from "../components/PageHeader";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const toast = useToast();
  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const [summaryData, lowStockData] = await Promise.all([
        api("/api/dashboard"),
        api("/api/products/low-stock"),
      ]);
      setSummary(summaryData.summary || summaryData.data || summaryData);
      setLowStockProducts(toArray(lowStockData));
    } catch (error) {
      setLoadError(error.message);
      toast(error.message, "error");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  const cards = [
    {
      label: "Total products",
      value: summary?.totalProducts ?? 0,
      hint: "Active products",
      icon: Package,
      color: "blue",
      to: "/products",
    },
    {
      label: "Stock units",
      value: Number(
        summary?.totalStockUnits ??
          0,
      ).toLocaleString("en-IN"),
      hint: "Units across inventory",
      icon: Boxes,
      color: "green",
      to: "/stock",
    },
    {
      label: "Low stock items",
      value: summary?.lowStockCount ?? lowStockProducts.length,
      hint: "Need your attention",
      icon: CircleAlert,
      color: "orange",
      to: "/products?filter=low",
    },
    {
      label: "Purchase value",
      value: money(summary?.totalPurchaseValue),
      hint: "Estimated inventory cost",
      icon: Wallet,
      color: "violet",
      to: "/products",
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="YOUR BUSINESS AT A GLANCE"
        title="Good to see you."
        description="Here’s what’s happening with your inventory today."
        action={
          <button
            className="secondary-button"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh
          </button>
        }
      />
      <div className="stat-grid">
        {cards.map(({ label, value, hint, icon: Icon, color, to }, index) => (
          <Link to={to} className="stat-card" key={label}>
            <div className="stat-card-top">
              <span>{label}</span>
              <span className={`stat-icon ${color}`}>
                <Icon size={19} />
              </span>
            </div>
            <div className="stat-value">
              {loading || loadError ? "—" : value}
            </div>
            <div className="stat-hint">
              <span className={`hint-dot ${color}`} />
              {hint}
            </div>
            <div className={`stat-decoration decor-${index}`} />
          </Link>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel inventory-panel">
          <div className="panel-heading">
            <div>
              <h3>Inventory snapshot</h3>
              <p>A quick look at your current products</p>
            </div>
            <Link to="/products" className="text-link">
              View products <ArrowRight size={15} />
            </Link>
          </div>
          <div className="snapshot-list">
            <div className="snapshot-row">
              <span className="snapshot-icon blue">
                <Package size={18} />
              </span>
              <div className="snapshot-info">
                <strong>Products catalog</strong>
                <small>Products registered in your workspace</small>
              </div>
              <b>{loading || loadError ? "—" : (summary?.totalProducts ?? 0)}</b>
            </div>
            <div className="snapshot-row">
              <span className="snapshot-icon green">
                <Boxes size={18} />
              </span>
              <div className="snapshot-info">
                <strong>Available stock</strong>
                <small>Total units currently recorded</small>
              </div>
              <b>
                {loading || loadError
                  ? "—"
                  : Number(
                      summary?.totalStockUnits ??
                        0,
                    ).toLocaleString("en-IN")}
              </b>
            </div>
            <div className="snapshot-row">
              <span className="snapshot-icon violet">
                <Tags size={18} />
              </span>
              <div className="snapshot-info">
                <strong>Categories</strong>
                <small>Keep similar products together</small>
              </div>
              <Link to="/categories" className="row-action">
                Manage <ArrowRight size={14} />
              </Link>
            </div>
          </div>
          <div className="panel-footer">
            <span>
              <Activity size={15} /> Live workspace overview
            </span>
            <span className="live-pill">
              <i /> {loadError ? "Unavailable" : "Synced"}
            </span>
          </div>
        </section>
        <section className="panel attention-panel">
          <div className="panel-heading">
            <div>
              <h3>Needs attention</h3>
              <p>Items at or below their low-stock threshold</p>
            </div>
            <span className="attention-count">
              {loading || loadError ? "—" : lowStockProducts.length}
            </span>
          </div>
          {loading ? (
            <div className="panel-loading">Checking stock…</div>
          ) : loadError ? (
            <div className="all-good" role="alert">
              <strong>Inventory data unavailable</strong>
              <p>{loadError}</p>
              <button className="secondary-button" onClick={load}>
                Try again
              </button>
            </div>
          ) : lowStockProducts.length ? (
            <div className="low-stock-list">
              {lowStockProducts.slice(0, 5).map((product) => (
                <div className="low-stock-item" key={product._id}>
                  <div className="product-avatar">
                    {(product.name || "P")[0].toUpperCase()}
                  </div>
                  <div className="low-stock-name">
                    <strong>{product.name}</strong>
                    <small>{product.sku || "No SKU"}</small>
                  </div>
                  <span className="stock-badge">
                    {product.stockQuantity ?? 0} left
                  </span>
                </div>
              ))}
              <Link to="/products?filter=low" className="attention-link">
                Review low stock <ArrowRight size={15} />
              </Link>
            </div>
          ) : (
            <div className="all-good">
              <div className="all-good-icon">
                <ArrowUpRight size={22} />
              </div>
              <strong>Everything looks good</strong>
              <p>No products are currently below their stock threshold.</p>
              <Link to="/products">
                View inventory <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </section>
      </div>
      <section className="quick-actions">
        <div>
          <div className="eyebrow">GET THINGS DONE</div>
          <h3>Quick actions</h3>
          <p>Jump straight into your daily inventory tasks.</p>
        </div>
        <div className="quick-action-buttons">
          <Link to="/products" className="quick-action">
            <span className="quick-icon blue">
              <Package size={18} />
            </span>
            <span>
              <strong>Manage products</strong>
              <small>Add or update items</small>
            </span>
            <ArrowRight size={16} />
          </Link>
          <Link to="/categories" className="quick-action">
            <span className="quick-icon violet">
              <Tags size={18} />
            </span>
            <span>
              <strong>Manage categories</strong>
              <small>Organize your catalog</small>
            </span>
            <ArrowRight size={16} />
          </Link>
          <Link to="/stock" className="quick-action">
            <span className="quick-icon green">
              <ArrowDownRight size={18} />
            </span>
            <span>
              <strong>Update stock</strong>
              <small>Record stock movement</small>
            </span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}
