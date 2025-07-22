# Development Plan

## Tech Stack
- Use Node.js for backend
- Use PostgreSQL as the database (configured via .env)
- Use Gmail SMTP for notifications (e.g., nodemailer)
- Do not use Python or SQLite

## Phase 1: Setup & Auth

If not already implemented, create or confirm the following:

- A PostgreSQL database schema defined in `backend/models`
- A login page component in `frontend/pages/Login.jsx`
- Auth logic in `backend/routes/auth.js`
- Session or JWT-based auth middleware in `backend/middleware/auth.js`
- Use `.env` for DB and SMTP config

## Phase 2: Core Tabs

Each tab should have:

- Backend route handlers in `backend/routes/customers.js`, `vendors.js`, and `contracts.js`
- Corresponding models in `backend/models/Customer.js`, `Vendor.js`, and `Contract.js`
- Frontend pages or views in `frontend/pages/Customers.jsx`, `Vendors.jsx`, and `Contracts.jsx`

Use dropdowns for:
- Selecting customer in contract form
- Selecting vendor in contract form

## Phase 3: Dashboard

Create a file `frontend/pages/Dashboard.jsx` that:

- Displays all contracts/licenses in a table
- Supports filtering by:
  - Customer name
  - Vendor name
  - Contract start/end date
- Allows column selection (optional)
- Supports pagination (10, 20, 50, all)

Backend route: `backend/routes/dashboard.js`

## Phase 4: Settings

Create a file `frontend/pages/Settings.jsx` for:

- User management (CRUD users)
- Notification rule setup:
  - Default: 30 days before expiration
  - Email time: selectable (HH:MM)
  - Toggle for "Include Active / Disabled"

Backend route: `backend/routes/settings.js`

Email logic: `backend/utils/emailNotifications.js` (if not created, do so)

## Phase 5: Final QA & Deployment

- Run full end-to-end test locally
- Confirm email notification works using Gmail SMTP
- Package for deployment (e.g., `npm run build`)
