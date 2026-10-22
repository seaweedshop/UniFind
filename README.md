# Lost & Found App

This repository now includes the Phase 1A foundation and Phase 1B authentication layer for a full-stack college Lost, Found, and Sell web application.

Current stack:

- Frontend: React, Vite, React Router, Axios
- Backend: Node.js, Express.js, JWT, bcryptjs, express-validator
- Database: MySQL via `mysql2`

Phase 1B adds:

- student registration and login
- JWT authentication
- protected frontend and backend routes
- persisted login state in `localStorage`
- logout handling
- authenticated dashboard access
- MySQL `users` table definition

## 1. Project Structure

```text
lost-found-app/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── SharedLayout.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── pages/
│   │   │   ├── Account.jsx
│   │   │   ├── CreateItem.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── FoundItems.jsx
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── LostItems.jsx
│   │   │   ├── Marketplace.jsx
│   │   │   ├── PostItem.jsx
│   │   │   └── Register.jsx
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── authService.js
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── assets/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── public/
│   ├── .env
│   ├── .env.example
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   └── testController.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── models/
│   │   └── userModel.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── testRoutes.js
│   ├── scripts/
│   │   ├── create_db.js
│   │   └── create_users_table.js
│   ├── sql/
│   │   └── users_table.sql
│   ├── uploads/
│   ├── .env
│   ├── .env.example
│   ├── server.js
│   └── package.json
│
├── .gitignore
└── README.md
```

## 2. Installation Commands

Run these commands from the project root (`lost-found-app`):

```bash
cd frontend
npm install
```

```bash
cd ../backend
npm install
```

If you want to recreate the local auth database objects, run:

```bash
cd backend
node scripts/create_db.js
node scripts/create_users_table.js
```

## 3. Environment Variables

Backend `backend/.env`:

```env
PORT=5001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=lost_found_db
JWT_SECRET=replace_with_a_secure_secret
FRONTEND_URL=http://localhost:5173
COLLEGE_EMAIL_DOMAIN=college.edu
```

Frontend `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5001/api
```

### Cloudinary image storage

New listing images are uploaded server-side to Cloudinary and stored in MySQL as secure URLs. Configure these variables in the backend environment, including the Render service environment settings:

```env
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

The Cloudinary API secret must remain backend-only and must not use a `VITE_` prefix. Existing `/uploads/...` image paths remain backward-compatible when the legacy file still exists; missing legacy files must be re-uploaded or recovered separately.

## 4. Development Commands

### Start backend

```bash
cd backend
npm run dev
```

### Start frontend

```bash
cd frontend
npm run dev
```

Run both servers in separate terminals. Vite may choose a nearby port if `5173` is busy; the backend CORS setup allows localhost dev origins.

## 5. Auth and API Endpoints

Public auth endpoints:

- `POST http://localhost:5001/api/auth/register`
- `POST http://localhost:5001/api/auth/login`
- `GET http://localhost:5001/api/auth/me`

Starter API endpoint:

- `GET http://localhost:5001/api/test`

Expected test response:

```json
{
  "message": "Backend server running successfully"
}
```

## 6. Database Notes

The users table is defined in `backend/sql/users_table.sql` and can also be created with `backend/scripts/create_users_table.js`.

Required user fields:

- `full_name`
- `email`
- `department`
- `year`
- `password`

Passwords are stored as bcrypt hashes, never in plain text.

## 7. Architecture Notes

- Frontend and backend are fully separated for clean scaling.
- Backend follows modular REST structure (`routes -> controllers -> models -> config`).
- Auth state is centralized in `frontend/src/context/AuthContext.jsx` and persisted in `localStorage`.
- Protected routes redirect unauthenticated users to the login page.
- MySQL connection uses pooled, reusable configuration.
- API base URL in frontend is centralized in `frontend/src/services/api.js` via `VITE_API_BASE_URL`.
- The authenticated app shell uses a shared navbar, sidebar, and protected dashboard routes.

## 8. Next Phase Suggestions

- Add lost/found item CRUD
- Add marketplace CRUD
- Add file upload handling under `backend/uploads`
- Add richer dashboard data and item activity feeds
