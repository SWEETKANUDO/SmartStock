import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Edit2,
  Plus,
  Search,
  Trash2,
  Package,
  RefreshCw,
  X,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { api, toArray } from "../api";
import { useToast } from "../components/Toast";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";

const blank = {
  name: '',
  sku: '',
  categoryId: '',
  purchasePrice: '',
  sellingPrice: '',
  stockQuantity: '0',
  lowStockThreshold: '5',
  unit: 'piece',
}
const money = (v) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(v || 0));
export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [params] = useSearchParams();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const toast = useToast();
  async function load() {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        api("/api/products"),
        api("/api/categories"),
      ]);
      setProducts(toArray(p));
      setCategories(toArray(c));
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    const handler = (event) => setSearch(event.detail);
    window.addEventListener("smartstock-search", handler);
    return () => window.removeEventListener("smartstock-search", handler);
  }, []);
  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const q = search.toLowerCase();
        const matches = `${p.name || ""} ${p.sku || ""} ${p.unit || ""}`
          .toLowerCase()
          .includes(q);
        const low =
          Number(p.stockQuantity || 0) <= Number(p.lowStockThreshold || 0);
        return matches && (params.get("filter") !== "low" || low);
      }),
    [products, search, params],
  );
  function openCreate() {
    setEditing(null);
    setForm(blank);
    setModal(true);
  }
  function openEdit(p) {
    setEditing(p);
    setForm({
      ...blank,
      ...p,
      categoryId: p.categoryId?._id || p.categoryId || "",
      purchasePrice: p.purchasePrice ?? "",
      sellingPrice: p.sellingPrice ?? "",
      stockQuantity: p.stockQuantity ?? "0",
      lowStockThreshold: p.lowStockThreshold ?? "5",
    });
    setModal(true);
  }
  async function save(e) {
    e.preventDefault();
    setSaving(true);
    const body = {
      ...form,
      purchasePrice: Number(form.purchasePrice),
      sellingPrice: Number(form.sellingPrice),
      stockQuantity: Number(form.stockQuantity),
      lowStockThreshold: Number(form.lowStockThreshold),
    };

    try {
      await api(editing ? `/api/products/${editing._id}` : "/api/products", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      toast(
        editing ? "Product updated successfully" : "Product added successfully",
      );
      setModal(false);
      await load();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }
  async function remove() {
    try {
      await api(`/api/products/${deleteTarget._id}`, { method: "DELETE" });
      toast("Product deleted");
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast(e.message, "error");
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="PRODUCT CATALOG"
        title="Products"
        description="Manage your products, prices and available quantities."
        action={
          <button className="primary-button" onClick={openCreate}>
            <Plus size={17} /> Add product
          </button>
        }
      />
      <div className="table-toolbar">
        <div className="toolbar-search">
          <Search size={17} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or SKU…"
          />
          <kbd>/</kbd>
          {search && (
            <button onClick={() => setSearch("")} aria-label="Clear search">
              <X size={15} />
            </button>
          )}
        </div>
        <div className="toolbar-meta">
          {params.get("filter") === "low" && (
            <span className="filter-chip">
              <AlertTriangle size={14} /> Low stock <a href="/products">×</a>
            </span>
          )}
          <span>{filtered.length} products</span>
          <button
            className="icon-button small"
            onClick={load}
            aria-label="Refresh products"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
      <section className="panel table-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>PRODUCT</th>
                <th>SKU</th>
                <th>CATEGORY</th>
                <th>UNIT COST</th>
                <th>SELLING PRICE</th>
                <th>STOCK</th>
                <th>STATUS</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                filtered.map((p) => {
                  const low =
                    Number(p.stockQuantity || 0) <=
                    Number(p.lowStockThreshold || 0);
                  return (
                    <tr key={p._id}>
                      <td>
                        <div className="table-product">
                          <div className="product-avatar">
                            {(p.name || "P")[0].toUpperCase()}
                          </div>
                          <strong>{p.name}</strong>
                        </div>
                      </td>
                      <td>
                        <span className="sku-text">{p.sku || "—"}</span>
                      </td>
                      <td>
                        {p.categoryId?.name ||
                          categories.find((c) => c._id === p.categoryId)
                            ?.name ||
                          "Uncategorized"}
                      </td>
                      <td>{money(p.purchasePrice)}</td>
                      <td className="price-strong">{money(p.sellingPrice)}</td>
                      <td>
                        <strong>{p.stockQuantity ?? 0}</strong>{" "}
                        <span className="unit-text">{p.unit || "pcs"}</span>
                      </td>
                      <td>
                        <span
                          className={`status-pill ${low ? "status-low" : "status-active"}`}
                        >
                          <i />
                          {low ? "Low stock" : "In stock"}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-button small"
                            onClick={() => openEdit(p)}
                            aria-label={`Edit ${p.name}`}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            className="icon-button small danger-hover"
                            onClick={() => setDeleteTarget(p)}
                            aria-label={`Delete ${p.name}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {loading && (
            <div className="table-loading">
              <RefreshCw size={18} className="spin" /> Loading products…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <EmptyState
              title={search ? "No matching products" : "No products yet"}
              description={
                search
                  ? "Try another search term."
                  : "Add your first product to start tracking stock."
              }
            />
          )}
        </div>
        <div className="table-footer">
          <span>
            Showing <strong>{filtered.length}</strong> of{" "}
            <strong>{products.length}</strong> products
          </span>
          <span>
            Inventory data <i className="live-dot" /> up to date
          </span>
        </div>
      </section>
      {modal && (
        <Modal
          title={editing ? "Edit product" : "Add a product"}
          onClose={() => setModal(false)}
          wide
        >
          <form className="modal-form" onSubmit={save}>
            <div className="form-grid">
              <label className="span-two">
                Product name
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Wireless keyboard"
                  required
                  maxLength="100"
                />
              </label>
              <label>
                SKU
                <input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="e.g. KEY-001"
                  required
                  maxLength="40"
                />
              </label>
              <label>
                Category
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  required
                >
                  <option value="">Choose category (optional)</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Purchase price (₹)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.purchasePrice}
                  onChange={(e) =>
                    setForm({ ...form, purchasePrice: e.target.value })
                  }
                  required
                />
              </label>
              <label>
                Selling price (₹)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.sellingPrice}
                  onChange={(e) =>
                    setForm({ ...form, sellingPrice: e.target.value })
                  }
                  required
                />
              </label>
              <label>
                Current stock
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.stockQuantity}
                  onChange={(e) =>
                    setForm({ ...form, stockQuantity: e.target.value })
                  }
                  required
                  disabled={Boolean(editing)}
                  title={
                    editing
                      ? "Use Stock movement to change existing stock safely"
                      : ""
                  }
                />
                {editing && (
                  <small className="field-hint">
                    Use Stock movement to change stock.
                  </small>
                )}
              </label>
              <label>
                Low-stock threshold
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.lowStockThreshold}
                  onChange={(e) =>
                    setForm({ ...form, lowStockThreshold: e.target.value })
                  }
                  required
                />
              </label>
              <label>
                Unit
                <select
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                >
                  <option value="piece">Pieces</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="gram">Grams (g)</option>
                  <option value="litre">Litres (l)</option>
                  <option value="ml">Millilitres (ml)</option>
                  <option value="pack">Packs</option>
                  <option value="box">Boxes</option>
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setModal(false)}
              >
                Cancel
              </button>
              <button className="primary-button" disabled={saving}>
                {saving ? "Saving…" : editing ? "Save changes" : "Add product"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleteTarget && (
        <Modal title="Delete product?" onClose={() => setDeleteTarget(null)}>
          <div className="confirm-body">
            <div className="confirm-icon">
              <Trash2 size={21} />
            </div>
            <p>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget.name}</strong>? This action cannot be
              undone.
            </p>
          </div>
          <div className="modal-actions">
            <button
              className="secondary-button"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </button>
            <button className="danger-button" onClick={remove}>
              Delete product
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
