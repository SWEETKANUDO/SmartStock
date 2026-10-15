# SmartStock Frontend

Responsive React + Vite frontend for the SmartStock inventory-management backend.

## 1. Install and run

Open a terminal in the `frontend` folder and run:

```bash
npm install
```

Create a `.env` file from `.env.example` and set the backend URL:

```env
VITE_API_URL=http://localhost:3000
```

Then run:

```bash
npm run dev
```

Vite normally opens at `http://localhost:5173`.

## 2. Features included

- Login and account creation screens
- JWT token stored in local storage and attached to API requests
- Dashboard summary and low-stock alert list
- Product list, search, create, edit and delete
- Category list, search, create, edit and delete
- Stock-in and stock-out operations
- Per-product stock movement history
- Responsive sidebar and mobile layout
- Toast messages, loading states, empty states and confirmation dialogs

## 3. Backend endpoints expected

The frontend is wired to these API endpoints:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/dashboard/summary`
- `GET /api/products`, `POST /api/products`
- `PATCH /api/products/:id`, `DELETE /api/products/:id`
- `GET /api/products/low-stock` (backend supports this; dashboard currently derives low stock from product records)
- `GET /api/categories`, `POST /api/categories`
- `PATCH /api/categories/:id`, `DELETE /api/categories/:id`
- `PATCH /api/stock/:id` with `{ "type": "in" | "out", "quantity": 1, "note": "optional" }`
- `GET /api/stock-history/:id`

The frontend expects login/signup responses to contain a token (`token` or `accessToken`) and optionally a `user` object. If your backend uses different signup field names or stock movement values, adjust the relevant request in `src/pages/AuthPage.jsx` or `src/pages/Stock.jsx`.

## 4. Build check

```bash
npm run build
```

If you deploy the frontend, configure `VITE_API_URL` in the hosting provider's environment variables to your deployed backend URL, then redeploy.
