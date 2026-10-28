# Data Platform Frontend

This project uses [VueJS 3](https://vuejs.org/) with [Vite](https://vitejs.dev/) and [TailwindCSS](https://tailwindcss.com/).
For form validation [Vuelidate](https://vuelidate-next.netlify.app/) is used.

State management is done via [Pinia](https://pinia.vuejs.org/).

## Project setup

    npm install

### Before startup
You need to either have a local backend running and or use a cloud deployed backend.

Setup a .env file with following variables, e.g.:

    VITE_ROOT_API=http://localhost:3000

VITE_ROOT_API is the URL for the backend API, either on localhost or in the cloud.
### Compiles and hot-reloads for development

    npm run dev

## Production build and deployment (D2)

    npm install
    npm run build      # outputs frontend/dist
    npm run serve      # vite preview: serves dist locally to check it

**API URL is set at build time.** `VITE_ROOT_API` (in `frontend/.env`) is compiled into
the bundle by Vite. To point the build at a deployed backend, change it and run
`npm run build` again; editing `.env` after building has no effect.

**SPA fallback (required).** The router uses HTML5 history (`createWebHistory`), so a
refresh on `/clientdetails/:id` asks the web host for a file that does not exist. The
host must serve `index.html` for any unknown path:
- Netlify / Cloudflare Pages: `public/_redirects` (`/* /index.html 200`) is copied into `dist/` automatically.
- Vercel: add a rewrite of `/(.*)` to `/index.html` in `vercel.json`.
- nginx: `location / { try_files $uri /index.html; }`
- `npm run serve` (vite preview) already falls back to `index.html`.

**CORS.** The backend must allow the frontend's origin (`CORS_ORIGIN` on the backend).
