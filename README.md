# HRM Console – React frontend

React 18 + TypeScript + Vite client for the NestJS HRM backend (`/api/v1`).
TanStack Query for data, React Router 6, axios. No UI framework – plain CSS with light/dark mode.

## Run it

```bash
cp .env.example .env      # defaults point at http://localhost:3000
npm install
npm run dev               # http://localhost:5173
```

Start the backend first (`npm run start:dev` in `hrm-backend`). In dev, Vite proxies `/api`
to `VITE_BACKEND_URL` so there are no CORS issues.

| Variable | Purpose |
|---|---|
| `VITE_BACKEND_URL` | Dev/preview proxy target (default `http://localhost:3000`) |
| `VITE_API_URL` | Full API base for production builds, e.g. `https://api.example.com/api/v1`. Leave empty to use same-origin `/api/v1`. When set, add the site origin to the backend `CORS_ORIGINS`. |

```bash
npm run build && npm run preview   # production build
npm run typecheck
```

## Login
Use the admin you seeded (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`). Other staff: an admin creates the
employee, then either creates a login under **User accounts**, or the employee self-activates on `/register`
using the same email.

## Screens and the endpoints they use

| Screen | Roles | Endpoints |
|---|---|---|
| Login / Register / Forgot password | public | `POST /auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/refresh`, `/auth/logout` |
| Dashboard | all | `GET /dashboard/summary`, `GET /health/ready`, attendance `today`, punch-in/out |
| Employees list / form / detail | Admin, HR, Manager (own team) | `GET/POST/PATCH/DELETE /employees`, `/employees/me`, `/:id/reportees`, `/:id/profile-image`, `/:id/addresses`, `/:id/bank-accounts` |
| My profile | all | `GET /employees/me` |
| Leaves | all (approvals: Admin, HR, Manager) | `GET/POST /leaves`, `/leaves/balance`, `PATCH /leaves/:id/decision`, `/cancel`, `/revoke` |
| Attendance | all (corrections: Admin, HR) | `GET /attendance`, `/attendance/today`, `/attendance/monthly`, `POST /attendance/punch-in`, `/punch-out`, `PUT /attendance` (correction) |
| Master data (7 pages) | Admin, HR (read: all) | `/departments`, `/designations`, `/branches`, `/work-shifts`, `/leave-types`, `/holidays`, `/blood-groups` |
| User accounts | Admin | `GET/POST/PATCH /users` |
| Security | all | `POST /auth/change-password`, `GET /auth/me` |

## Behaviour worth knowing
- The API envelope (`{success,data,meta}`) is unwrapped in `src/api/client.ts`; errors become `ApiError` with field messages shown in toasts/forms.
- A 401 triggers one shared token refresh, then the request is retried; if refresh fails the user is sent to `/login` and returned to the page afterwards.
- Nav items and routes are role-gated; the server enforces the same rules.
- Login is rate-limited by the backend (10/min per IP) – the UI shows the server message.
"# hrm" 
