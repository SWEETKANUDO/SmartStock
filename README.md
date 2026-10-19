# SmartStock

Inventory management application with a React/Vite frontend and Express/MongoDB API.

## Requirements

- Node.js 20.19 or newer
- MongoDB replica set or sharded cluster (stock movements and account signup use transactions)

## Local development

1. Configure `backend/.env` from `backend/.env.example`. Set `MONGODB_URI` and a
   non-placeholder `JWT_ACCESS_SECRET`.
2. Start the API from `backend/` with `npm install` and `npm run dev`.
3. Configure `frontend/.env` from `frontend/.env.example`; the local API URL
   should be `http://localhost:5000`.
4. Start the frontend from `frontend/` with `npm install` and `npm run dev`.

## Production checks

- Set `NODE_ENV=production`, `MONGODB_URI`, a random `JWT_ACCESS_SECRET` with at
  least 32 characters, and the exact HTTPS frontend origin in `FRONTEND_URL`.
- Set `VITE_API_URL` to the deployed HTTPS API origin when building the frontend.
  Production frontend builds fail when this variable is missing.
- Run `npm test` from `backend/`, `npm run build` from `frontend/`, and
  `npm audit` in both packages before deployment.

See [frontend/README.md](./frontend/README.md) for frontend details.