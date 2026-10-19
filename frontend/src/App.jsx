
import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { api } from "./api";
import AuthPage from "./pages/AuthPage";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import Stock from "./pages/Stock";
import { ToastProvider } from "./components/Toast";

export default function App() {
  const [token, setToken] = useState(
    localStorage.getItem("smartstock_token"),
  );
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(
    Boolean(localStorage.getItem("smartstock_token")),
  );
  const [sessionError, setSessionError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setSessionError(null);
      setChecking(false);
      return;
    }

    setChecking(true);
    setSessionError(null);

    api("/api/auth/me")
      .then((data) => {
        setUser(data.user);
      })
      .catch((error) => {
        if (error.status === 401 || error.status === 403) {
          localStorage.removeItem("smartstock_token");
          setToken(null);
          setUser(null);
          return;
        }
        setSessionError(
          error.status
            ? error.message
            : "Unable to verify your session. Check your connection and try again.",
        );
        setUser(null);
      })
      .finally(() => {
        setChecking(false);
      });
  }, [token, retryCount]);

  function onLogin(newToken, userData) {
    localStorage.setItem("smartstock_token", newToken);
    setUser(userData || null);
    setSessionError(null);
    setToken(newToken);
  }

  function onLogout() {
    localStorage.removeItem("smartstock_token");
    setSessionError(null);
    setToken(null);
    setUser(null);
  }

  if (checking) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading SmartStock...</p>
      </div>
    );
  }

  if (!token) {
    return (
      <ToastProvider>
        <AuthPage onLogin={onLogin} />
      </ToastProvider>
    );
  }

  if (sessionError) {
    return (
      <div className="loading-screen" role="alert">
        <p>We couldn’t verify your session: {sessionError}</p>
        <button
          className="primary-button"
          onClick={() => setRetryCount((count) => count + 1)}
        >
          Try again
        </button>
        <button className="secondary-button" onClick={onLogout}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <ToastProvider>
      <Routes>
        <Route
          element={<Layout user={user} onLogout={onLogout} />}
        >
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="categories" element={<Categories />} />
          <Route path="stock" element={<Stock />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}
