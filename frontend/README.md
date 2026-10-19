# SmartStock Frontend

Responsive React + Vite frontend for the SmartStock inventory-management backend.

## 1. Install and run

Open a terminal in the `frontend` folder and run:

```bash
npm install
```

Create a `.env` file from `.env.example` and set the backend URL:

```env
VITE_API_URL=http://localhost:5000
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
- `GET /api/dashboard`
- `GET /api/products`, `POST /api/products`
- `PUT /api/products/:id`, `DELETE /api/products/:id`
- `GET /api/products/low-stock`
- `GET /api/categories`, `POST /api/categories`
- `PUT /api/categories/:id`, `DELETE /api/categories/:id`
- `PATCH /api/stock/:id` with `{ "type": "in" | "out", "quantity": 1, "note": "optional" }`
- `GET /api/stock-history/:id`

The backend requires a MongoDB replica set or sharded cluster for transactional stock movements. Configure `MONGODB_URI`, `JWT_ACCESS_SECRET`, and `FRONTEND_URL` in the backend environment. Configure `VITE_API_URL` as the deployed backend origin when building the frontend; production builds fail if it is missing.

## 4. Build check

```bash
npm run build
```

If you deploy the frontend, configure `VITE_API_URL` in the hosting provider's environment variables to your deployed backend URL, then redeploy.
