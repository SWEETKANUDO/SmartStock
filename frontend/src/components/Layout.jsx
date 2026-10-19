import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Boxes,
  LayoutDashboard,
  Tags,
  Package,
  ArrowLeftRight,
  LogOut,
  Menu,
  X,
  Search,
  ChevronDown,
} from "lucide-react";

const links = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/products", label: "Products", icon: Package },
  { to: "/categories", label: "Categories", icon: Tags },
  { to: "/stock", label: "Stock movement", icon: ArrowLeftRight },
];
const titles = {
  "/": "Overview",
  "/products": "Products",
  "/categories": "Categories",
  "/stock": "Stock movement",
  "/stock-history": "Stock History",
};
export default function Layout({ user, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  useEffect(() => {
    function focusSearch(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);
  const name =
    user?.name ||
    user?.fullName ||
    user?.email?.split("@")[0] ||
    "Workspace user";
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="app-shell">
      {mobileOpen && (
        <button
          className="mobile-scrim"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        />
      )}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Boxes size={22} />
          </div>
          <span>
            smart<span className="brand-accent">stock</span>
          </span>
          <button
            className="mobile-close icon-button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <div className="workspace-card">
          <div className="workspace-icon">S</div>
          <div>
            <strong>
              {user?.business?.name || user?.businessName || "My business"}
            </strong>
            <small>Inventory workspace</small>
          </div>
          <ChevronDown size={15} />
        </div>
        <nav className="nav-links">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={19} />
              <span>{label}</span>
              {label === "Products" && <span className="nav-dot" />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">?</div>
            <div>
              <strong>Need a hand?</strong>
              <p>Keep your inventory in control.</p>
            </div>
          </div>
          <button className="nav-link logout-link" onClick={onLogout}>
            <LogOut size={19} />
            <span>Sign out</span>
          </button>
          <div className="sidebar-footer">
            SMARTSTOCK <span>•</span> INVENTORY
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={21} />
            </button>
            <div>
              <div className="breadcrumbs">
                Workspace <span>/</span>{" "}
                <strong>{titles[location.pathname] || "Overview"}</strong>
              </div>
              <h1>{titles[location.pathname] || "Overview"}</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="top-search">
              <Search size={17} />
              <input
                ref={searchRef}
                placeholder="Search anything…"
                aria-label="Search"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && event.target.value.trim()) {
                    const query = event.target.value.trim();
                    if (location.pathname === "/") {
                      navigate(`/products?search=${encodeURIComponent(query)}`);
                      return;
                    }
                    window.dispatchEvent(
                      new CustomEvent("smartstock-search", {
                        detail: query,
                      }),
                    );
                  }
                }}
              />
              <kbd>⌘ K</kbd>
            </div>
            <div className="top-user">
              <div className="avatar">{initials}</div>
              <div className="top-user-text">
                <strong>{name}</strong>
                <small>{user?.role || "Administrator"}</small>
              </div>
            </div>
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
