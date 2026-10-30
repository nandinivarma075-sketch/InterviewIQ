# InterviewIQ Deployment Guide

This project is configured as a **unified full-stack application**. The Express backend serves both the `/api/*` endpoints and the compiled React (Vite) Single Page Application, eliminating cross-origin CORS complexity and enabling single-service hosting on **Render**, **Railway**, or **Docker**.

---

## 🚀 Quick Deployment Options

### Option 1: Deploy to Render (Recommended Free Tier)

Render can build and run this repository directly from GitHub with zero extra configuration using the included [`render.yaml`](file:///Users/harshitamaniswaripeddinti/Desktop/__MACOSX/render.yaml).

1. Push your repository to **GitHub**.
2. Go to your [Render Dashboard](https://dashboard.render.com/) and click **New +** > **Blueprint**.
3. Select your repository. Render will automatically detect `render.yaml`.
4. Render will populate the following settings automatically:
   - **Environment:** Node
   - **Build Command:** `npm run postinstall && npm run build`
   - **Start Command:** `npm start`
   - **Auto-generated Variables:** `JWT_SECRET`, `NODE_ENV=production`
5. Click **Apply**. Once built, Render gives you a live public URL (e.g. `https://interviewiq.onrender.com`).

---

### Option 2: Deploy to Railway

1. Push your repository to **GitHub**.
2. Go to [Railway.app](https://railway.app/) and click **New Project** > **Deploy from GitHub repo**.
3. Select your repository. Railway automatically reads [`railway.json`](file:///Users/harshitamaniswaripeddinti/Desktop/__MACOSX/railway.json).
4. In Railway dashboard **Variables**, add:
   - `JWT_SECRET`: *(A random 32+ character secure secret)*
   - `NODE_ENV`: `production`
5. Click **Deploy**. In **Settings** > **Networking**, generate a public domain to access your live site.

---

### Option 3: Deploy with Docker / Docker Compose

If deploying on a VPS (DigitalOcean, AWS EC2, Hetzner, Linode) or local container runtime:

1. Build and run via [`docker-compose.yml`](file:///Users/harshitamaniswaripeddinti/Desktop/__MACOSX/docker-compose.yml):
   ```bash
   docker compose up -d --build
   ```
2. The application will be live at `http://localhost:4000`.
3. Persistent database data is mapped to the Docker volume `interviewiq_data`.

---

## ⚙️ Environment Variables Reference

| Variable | Description | Recommended Production Value |
| :--- | :--- | :--- |
| `PORT` | Port the unified server listens on | Provided automatically by host (e.g. `10000` on Render) |
| `NODE_ENV` | Environment mode | `production` |
| `JWT_SECRET` | Secret key for signing and verifying auth tokens | Strong random string (32+ chars) |
| `DB_PATH` | Path to persistent SQLite database | `./data/interviewiq.db` |
| `CLIENT_DIST_PATH` | *(Optional)* Custom path to built frontend | Default automatically resolves `AI_Interview_Coach_Frontend/dist` |
| `FRONTEND_URL` | *(Optional)* Allowed CORS origin if decoupled | Handled automatically when serving unified |

---

## 🛠️ Local Production Testing

Before deploying, you can test the production build locally:

```bash
# 1. Build frontend bundle
npm run build

# 2. Start unified production server
npm start
```

Visit `http://localhost:4000` in your browser. Both the React UI and API endpoints (`/api/*`) are served together.
