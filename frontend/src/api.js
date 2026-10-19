const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function api(path, options = {}) {
  const token = localStorage.getItem("smartstock_token");
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  if (!response.ok) {
    throw new ApiError(
      data?.message || data?.error || `Request failed (${response.status})`,
      response.status,
    );
  }
  return data;
}

export const toArray = (data) =>
  Array.isArray(data)
    ? data
    : data?.products || data?.categories || data?.items || data?.data || [];
