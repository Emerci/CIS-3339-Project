# Data Platform – CIS 3339 Fall 2026, Group 23

A web app for a community organization to manage **clients**, **events**, and **services**.

- **Frontend:** Vue 3 (Composition API, `<script setup>`), Vite, Pinia, Tailwind CSS
- **Backend:** Node.js + Express REST API, JWT login
- **Database:** MongoDB Atlas (cloud), accessed through Mongoose

```
Browser (Vue app, port 5173)  →  Express API (port 3000)  →  MongoDB Atlas
```

---

## 1. Prerequisites

| Tool | Version |
| --- | --- |
| Node.js | 18 or newer (we tested with Node 22) |
| npm | comes with Node |
| Git | any recent version |
| MongoDB | none to install – the database is hosted on MongoDB Atlas |

---

## 2. Get the code

```
git clone https://github.com/Emerci/CIS-3339-Project.git
cd CIS-3339-Project
```

---

## 3. Environment files

The `.env` files are **submitted through Canvas**, not committed to GitHub. Copy them into place before starting:

- `backend/.env`
- `frontend/.env`

### backend/.env

| Variable | What it does |
| --- | --- |
| `MONGO_URL` | MongoDB Atlas connection string (includes the database user and database name) |
| `PORT` | Port the API listens on. Use `3000` |
| `ORG_ID` | ID of the organization this app instance belongs to. All clients, events, and services are saved under this org |
| `JWT_SECRET` | Random string used to sign and verify login tokens |
| `CORS_ORIGIN` | The frontend's URL that is allowed to call the API, e.g. `http://localhost:5173` |

### frontend/.env

| Variable | What it does |
| --- | --- |
| `VITE_ROOT_API` | URL of the backend API, e.g. `http://localhost:3000`. This is baked in at build time, so rebuild after changing it |

---

## 4. Install and run

Use **two terminals**, one for the backend and one for the frontend.

### Terminal 1 – backend

```
cd backend
npm install
node seed-local.js     # creates the organization and the two demo accounts (safe to run again)
npm start              # API runs at http://localhost:3000
```

You should see `Database connection Success!` and `Server listening on port 3000`.

`npm run dev` does the same thing but restarts automatically when you edit code (uses nodemon).

### Terminal 2 – frontend

```
cd frontend
npm install
npm run dev            # app runs at http://localhost:5173
```

Open http://localhost:5173 in your browser.

---

## 5. Demo accounts

| Role | Username | Password | What they can do |
| --- | --- | --- | --- |
| Editor | `admin` | `admin` | View, create, edit, and delete clients, events, and services; register clients for events |
| Viewer | `user` | `user` | View and search only |

Passwords are stored hashed with bcrypt.

---

## 6. Production build and deployment

### Build the frontend

```
cd frontend
npm run build          # creates the frontend/dist folder
npm run serve          # previews the built site locally to check it works
```

### Deploy

1. **Database** – already on MongoDB Atlas. In Atlas → *Network Access*, allow the backend server's IP (or `0.0.0.0/0` for grading).
2. **Backend** – deploy the `backend` folder to any Node host (e.g. Render). Set the same variables from `backend/.env` in the host's environment settings. Start command: `npm start`.
3. **Frontend** – set `VITE_ROOT_API` in `frontend/.env` to the deployed backend URL, run `npm run build`, and upload the `dist` folder to a static host (e.g. Netlify).
4. **SPA fallback** – the app uses history-mode routing, so the host must send `index.html` for any unknown path. `public/_redirects` handles this on Netlify automatically.
5. **CORS** – set `CORS_ORIGIN` on the backend to the deployed frontend URL so the browser is allowed to call the API.

---

## 7. How we tested the system

Integration test we run after setup:

1. Start backend and frontend, confirm `Database connection Success!`.
2. Log in as `admin` → create a client, an event, and a service; register the client for the event; edit and delete a record.
3. Log out, log in as `user` → confirm lists and search work and that add/edit/delete options are not shown.
4. Run `npm run build` and `npm run serve` and repeat a login to confirm the production build works.

---

## 8. Known limitations

- The **Description** field on the Create Event form is not saved.
- Role checks are enforced in the frontend; backend role checks are still being added.

---

## 9. Project structure

```
backend/
  app.js              Express app, routes, error handler
  routes/             clients, events, services, org, users (login)
  models/models.js    Mongoose schemas
  auth/               JWT middleware
  seed-local.js       creates the org and demo accounts
frontend/
  src/views/          pages (clients, events, services, login, dashboard)
  src/components/     charts
  src/api/api.js      all API calls (Axios)
  src/store/          Pinia login state
  src/router/         routes + login guard
```