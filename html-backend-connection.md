# Connecting the HTML/CSS Frontend to the Current Express Backend

## The Core Problem

The current backend is a **pure JSON API**. It:
- Accepts `Content-Type: application/json` request bodies
- Returns `{ user, token, refreshToken }` JSON objects
- Expects the client to store tokens in `localStorage`
- Has no concept of sessions or cookies

HTML forms work completely differently. They:
- Submit as `application/x-www-form-urlencoded` (not JSON)
- Cannot store tokens in localStorage without JavaScript
- Need the server to redirect them after a POST (the Post/Redirect/Get pattern)
- Need the server to remember who is logged in across requests (sessions)

This guide covers every exact change required to bridge the two — without breaking the existing JSON API (which can stay in place for future use or debugging).

---

## Strategy: The Bridge Approach

Rather than completely rewriting the backend, the cleanest path is to **add a form-aware layer alongside the existing JSON API**:

```
Existing JSON API (/api/*)  ←── stays untouched
          +
New HTML form layer         ←── added on top
  - Serves static HTML files
  - Handles form POST submissions
  - Manages sessions via cookies
  - Renders search results into HTML
```

This means the backend runs both at the same time. The HTML frontend uses the new form layer. Any future API client (mobile app, Postman, etc.) continues to use `/api/*` unchanged.

---

## Overview of All Changes Required

### Backend (5 changes)
1. Install 3 new packages: `express-session`, `connect-pg-simple`, `ejs`
2. Add `express.urlencoded()` middleware to parse HTML form data
3. Add `express.static()` to serve the HTML/CSS files
4. Add session middleware to track who is logged in
5. Add 5 new routes: `GET /search`, `POST /login`, `POST /register`, `GET /logout`, `GET /profile`

### Frontend (2 changes)
1. All `<form>` elements point to the new routes above
2. One `<script>` tag in `search.html` for Nominatim geocoding before form submit (optional, see Section 7)

### Environment (1 change)
1. Add `SESSION_SECRET` to `backend/.env`

---

## Step 1 — Install New Packages

```bash
cd backend
npm install express-session connect-pg-simple ejs
npm install --save-dev @types/express-session @types/connect-pg-simple @types/ejs
```

| Package | Purpose |
|---|---|
| `express-session` | Stores a session ID in a browser cookie; keeps user logged in across page loads |
| `connect-pg-simple` | Stores session data in PostgreSQL (uses your existing `DATABASE_URL`) |
| `ejs` | Allows `.ejs` HTML templates where the backend can inject data (donor results, user info) |

---

## Step 2 — Create the Sessions Table in PostgreSQL

`connect-pg-simple` needs one table to store sessions. Run this once:

```bash
psql -U postgres -d bloodconnect -c "
  CREATE TABLE IF NOT EXISTS session (
    sid    VARCHAR        NOT NULL COLLATE \"default\",
    sess   JSON           NOT NULL,
    expire TIMESTAMP(6)   NOT NULL
  );
  ALTER TABLE session ADD CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE;
  CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);
"
```

Or add it to a new migration file `backend/src/db/add_sessions_table.sql`:

```sql
CREATE TABLE IF NOT EXISTS session (
  sid    VARCHAR        NOT NULL COLLATE "default",
  sess   JSON           NOT NULL,
  expire TIMESTAMP(6)   NOT NULL,
  CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE
);
CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);
```

---

## Step 3 — Add `SESSION_SECRET` to `.env`

```env
# backend/.env  — add this line
SESSION_SECRET=generate-a-long-random-string-here-at-least-32-chars

# Generate one with:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Step 4 — Update `server.ts`

This is the central change. The full updated `server.ts`:

```ts
import cors from "cors";
import express, { type Request, type Response } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import donors from "./routes/donors.js";
import auth from "./routes/auth.js";
import pages from "./routes/pages.js";       // ← new: HTML page routes
import type { HealthResponse } from "./types/index.js";
import { pool } from "./db/pool.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────

// 1. Parse HTML form submissions (application/x-www-form-urlencoded)
//    MUST come before routes. The existing express.json() handles JSON API calls.
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 2. CORS — only needed for external API clients now.
//    HTML pages are served from the same origin, so no CORS issues.
app.use(cors({
  origin: process.env.CORS_ORIGIN || false,  // false = same-origin only
  credentials: true
}));

// 3. Session middleware — sets a cookie "bloodconnect.sid" in the browser
const PgSession = connectPgSimple(session);
app.use(session({
  store: new PgSession({
    pool,                           // reuse your existing pg connection pool
    tableName: "session",
    createTableIfMissing: false     // we created it manually in Step 2
  }),
  secret: process.env.SESSION_SECRET || "change-this-in-production",
  resave: false,
  saveUninitialized: false,
  name: "bloodconnect.sid",
  cookie: {
    secure: process.env.NODE_ENV === "production",  // HTTPS-only in prod
    httpOnly: true,                  // not accessible to JS (security)
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  }
}));

// 4. Serve the frontend HTML/CSS/assets as static files
//    Requests for index.html, search.html, output.css, etc. are served from here
const frontendPath = join(__dirname, "../../frontend");
app.use(express.static(frontendPath));

// ── Routes ────────────────────────────────────────────────────────────────────

// Health check
app.get("/health", (_req: Request, res: Response<HealthResponse>) => {
  res.json({ ok: true, timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Existing JSON API — UNTOUCHED
app.use("/api/donors", donors);
app.use("/api/auth", auth);

// New HTML page routes (form submissions + server-rendered pages)
app.use("/", pages);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🩸 BloodConnect running on port ${PORT}`));
```

**Key point about middleware order:** `express.urlencoded()` must be registered before any routes so form body data is available in `req.body`. `express.static()` is registered before the page routes so CSS/image files are served without going through the route handlers.

---

## Step 5 — Create `src/routes/pages.ts`

This new file handles all HTML form submissions and server-rendered pages. It sits alongside `auth.ts` and `donors.ts`.

```ts
import { Router, type Request, type Response } from "express";
import { pool } from "../db/pool.js";
import bcrypt from "bcrypt";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const router = Router();

// Extend the session type to include our user data
declare module "express-session" {
  interface SessionData {
    userId: number;
    user: {
      id: number;
      name: string;
      email: string;
      blood_group: string;
      phone: string;
      address: string;
      lat: number;
      lng: number;
    };
  }
}

// ── Helper: Geocode a text location via Nominatim ─────────────────────────────
// Called server-side when the HTML search form submits a location text string
const geocodeLocation = async (locationText: string): Promise<{ lat: number; lng: number } | null> => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationText)}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: { "User-Agent": "BloodConnect/1.0 (bloodconnect@example.com)" }
    });
    const results = await response.json() as Array<{ lat: string; lon: string }>;
    if (results.length > 0) {
      return { lat: Number(results[0].lat), lng: Number(results[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
};

// ── POST /login ───────────────────────────────────────────────────────────────
// Handles the HTML login form submission
// <form action="/login" method="POST">
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) {
    // Redirect back to login page with an error indicator
    return res.redirect("/login.html?error=missing_fields");
  }

  try {
    const result = await pool.query(
      `SELECT id, name, email, password_hash, blood_group, phone, address, lat, lng
       FROM donors WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.redirect("/login.html?error=invalid_credentials");
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.redirect("/login.html?error=invalid_credentials");
    }

    // Store user in session — this sets the browser cookie automatically
    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      blood_group: user.blood_group,
      phone: user.phone,
      address: user.address,
      lat: user.lat,
      lng: user.lng
    };

    // Redirect to home page after successful login
    return res.redirect("/?logged_in=1");
  } catch (error) {
    console.error("Login form error:", error);
    return res.redirect("/login.html?error=server_error");
  }
});

// ── POST /register ────────────────────────────────────────────────────────────
// Handles the HTML register form submission
// <form action="/register" method="POST">
router.post("/register", async (req: Request, res: Response) => {
  const { name, email, password, blood_group, phone, address, location_text, lat, lng } = req.body as {
    name: string; email: string; password: string; blood_group: string;
    phone: string; address: string; location_text?: string; lat?: string; lng?: string;
  };

  // Validate required fields
  if (!name || !email || !password || !blood_group || !phone) {
    return res.redirect("/register.html?error=missing_fields");
  }

  if (password.length < 6) {
    return res.redirect("/register.html?error=password_too_short");
  }

  // Resolve coordinates — use submitted lat/lng directly, or geocode the location text
  let coordLat: number | null = lat ? Number(lat) : null;
  let coordLng: number | null = lng ? Number(lng) : null;

  if ((!coordLat || !coordLng) && location_text) {
    const coords = await geocodeLocation(location_text);
    if (coords) {
      coordLat = coords.lat;
      coordLng = coords.lng;
    }
  }

  if (!coordLat || !coordLng) {
    return res.redirect("/register.html?error=location_required");
  }

  try {
    // Check for existing email
    const existing = await pool.query("SELECT id FROM donors WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.redirect("/register.html?error=email_taken");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO donors (name, email, password_hash, blood_group, phone, address, lat, lng, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ST_SetSRID(ST_MakePoint($9, $10), 4326))
       RETURNING id, name, email, blood_group, phone, address, lat, lng`,
      [name, email, passwordHash, blood_group, phone, address || null,
       coordLat, coordLng, coordLng, coordLat]  // PostGIS: MakePoint(lng, lat)
    );

    const user = result.rows[0];

    // Log the new user in immediately after registering
    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      blood_group: user.blood_group,
      phone: user.phone,
      address: user.address,
      lat: user.lat,
      lng: user.lng
    };

    return res.redirect("/?registered=1");
  } catch (error) {
    console.error("Register form error:", error);
    return res.redirect("/register.html?error=server_error");
  }
});

// ── GET /logout ───────────────────────────────────────────────────────────────
// Destroys the session and redirects to home
// <a href="/logout">Logout</a>
router.get("/logout", (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) console.error("Session destroy error:", err);
    res.clearCookie("bloodconnect.sid");
    res.redirect("/");
  });
});

// ── GET /search ───────────────────────────────────────────────────────────────
// Handles the search form submission and renders results
// <form action="/search" method="GET">  ← GET so URL is bookmarkable
router.get("/search", async (req: Request, res: Response) => {
  const { blood_group, location, lat, lng, radius_km = "10" } = req.query as {
    blood_group?: string; location?: string; lat?: string; lng?: string; radius_km?: string;
  };

  // If no search params, just serve the static search.html
  if (!location && !lat && !lng) {
    return res.sendFile(join(__dirname, "../../../frontend/search.html"));
  }

  // Resolve coordinates
  let coordLat: number | null = lat ? Number(lat) : null;
  let coordLng: number | null = lng ? Number(lng) : null;

  if ((!coordLat || !coordLng) && location) {
    const coords = await geocodeLocation(location);
    if (coords) { coordLat = coords.lat; coordLng = coords.lng; }
  }

  if (!coordLat || !coordLng) {
    // Can't find the location — render search page with an error state
    return res.sendFile(join(__dirname, "../../../frontend/search.html"));
  }

  try {
    // PostGIS spatial query — same query as the existing /api/donors endpoint
    const params: (number | string)[] = [coordLat, coordLng, Number(radius_km)];
    const bloodGroupClause = blood_group ? `AND blood_group = $4` : "";
    if (blood_group) params.push(blood_group);

    const { rows } = await pool.query(
      `SELECT id, name, blood_group, phone, email, address, lat, lng,
              ST_Distance(location, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) / 1000 AS distance_km
       FROM donors
       WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3 * 1000)
       ${bloodGroupClause}
       ORDER BY distance_km ASC
       LIMIT 100`,
      params
    );

    // Render the search results page using EJS template
    res.render("search", {
      donors: rows,
      query: { blood_group: blood_group || "", location: location || "", radius_km },
      user: req.session.user || null,
      count: rows.length
    });
  } catch (error) {
    console.error("Search page error:", error);
    res.sendFile(join(__dirname, "../../../frontend/search.html"));
  }
});

// ── GET /profile ──────────────────────────────────────────────────────────────
// Shows the logged-in user's profile
router.get("/profile", async (req: Request, res: Response) => {
  if (!req.session.userId) {
    return res.redirect("/login.html?error=login_required");
  }

  try {
    const result = await pool.query(
      `SELECT id, name, email, blood_group, phone, address, lat, lng
       FROM donors WHERE id = $1`,
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      req.session.destroy(() => {});
      return res.redirect("/");
    }

    res.render("profile", { user: result.rows[0] });
  } catch (error) {
    console.error("Profile page error:", error);
    res.redirect("/");
  }
});

export default router;
```

---

## Step 6 — Configure the EJS View Engine and Template Folder

Add this to `server.ts`, after the middleware and before the routes:

```ts
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Tell Express where to find EJS templates
app.set("view engine", "ejs");
app.set("views", join(__dirname, "views"));
```

Create the folder:
```bash
mkdir -p backend/src/views
```

---

## Step 7 — Create `src/views/search.ejs`

This is the only page that needs server-side templating because it renders dynamic donor data. All other pages (`index.html`, `login.html`, `register.html`) are static files served directly by `express.static()`.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Find Donors — BloodConnect</title>
  <!-- CSS is served from the frontend static folder -->
  <link rel="stylesheet" href="/css/output.css">
</head>
<body class="min-h-screen bg-white overflow-x-hidden">

  <!-- ── HEADER ── (same as index.html, copy it here) -->
  <!-- If user is logged in, show profile button; otherwise show login -->
  <header class="fixed top-0 left-0 right-0 z-[1000] bg-white shadow border-b border-gray-200">
    <div class="w-full px-8">
      <div class="flex justify-between items-center h-16">
        <div class="flex items-center gap-2">
          <span class="text-2xl">🩸</span>
          <a href="/" class="text-2xl font-bold text-red-600 no-underline">BloodConnect</a>
        </div>
        <nav class="flex gap-8 items-center">
          <a href="/" class="text-gray-700 no-underline font-medium hover:text-red-600 transition-colors">Home</a>
          <a href="/search" class="text-red-600 font-medium border-b-2 border-red-600 pb-1">Find Donor</a>
          <a href="/register.html" class="text-gray-700 no-underline font-medium hover:text-red-600 transition-colors">Register</a>
        </nav>
        <% if (user) { %>
          <!-- Logged-in: show name + logout -->
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium text-gray-700"><%= user.name %></span>
            <span class="blood-badge"><%= user.blood_group %></span>
            <a href="/logout" class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors no-underline">Logout</a>
          </div>
        <% } else { %>
          <!-- Guest: show login button -->
          <a href="/login.html" class="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold no-underline hover:bg-red-700 transition-colors">Login</a>
        <% } %>
      </div>
    </div>
  </header>

  <main class="pt-16 w-full">

    <!-- ── SEARCH FORM ── (pre-filled with current query values) -->
    <section class="bg-gradient-to-br from-red-600 to-red-700 text-white py-16 text-center w-full">
      <div class="max-w-3xl mx-auto px-8">
        <h1 class="text-4xl font-extrabold mb-8">Find Blood Donors Near You</h1>
        <form action="/search" method="GET"
              class="bg-white p-8 rounded-2xl shadow-2xl">
          <div class="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-center">

            <!-- Blood group — pre-selected with current search value -->
            <select name="blood_group"
              class="h-[60px] px-4 border-2 border-gray-300 rounded-xl text-base text-gray-700
                     appearance-none outline-none focus:border-red-600 transition-all">
              <option value="">All Blood Groups</option>
              <% ['A+','A-','B+','B-','AB+','AB-','O+','O-'].forEach(function(bg) { %>
                <option value="<%= bg %>" <%= (query.blood_group === bg) ? 'selected' : '' %>>
                  <%= bg %>
                </option>
              <% }); %>
            </select>

            <!-- Location — pre-filled with current search value -->
            <div class="relative flex items-center h-[60px] border-2 border-gray-300 rounded-xl
                        focus-within:border-red-600 focus-within:ring-4 focus-within:ring-red-600/10 transition-all">
              <svg class="absolute left-4 w-5 h-5 text-gray-400 pointer-events-none"
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              </svg>
              <input type="text" name="location"
                     value="<%= query.location %>"
                     placeholder="Enter your city or address"
                     class="w-full h-full border-none outline-none text-base text-gray-700
                            bg-transparent pl-11 pr-4">
            </div>

            <button type="submit"
              class="flex items-center justify-center gap-2 bg-red-600 text-white h-[60px]
                     px-8 rounded-xl font-semibold hover:bg-red-700 hover:-translate-y-0.5
                     transition-all min-w-[160px]">
              Find Blood Now
            </button>
          </div>
        </form>
      </div>
    </section>

    <!-- ── RESULTS ── -->
    <section class="py-16 px-8 bg-white">
      <div class="max-w-7xl mx-auto">

        <div class="text-center mb-12">
          <h2 class="text-4xl font-bold text-red-600 mb-4">Nearby Donors</h2>
          <% if (count > 0) { %>
            <p class="text-lg text-gray-600">
              Found <strong><%= count %></strong> donor<%= count !== 1 ? 's' : '' %>
              <% if (query.location) { %> near "<%= query.location %>"<% } %>
            </p>
          <% } %>
        </div>

        <!-- Map placeholder (iframe) -->
        <div class="bg-white rounded-2xl overflow-hidden shadow-md mb-8 h-96 w-full">
          <iframe
            src="https://www.openstreetmap.org/export/embed.html?bbox=-74.26,40.48,-73.70,40.92&layer=mapnik"
            class="w-full h-full border-none"
            title="Donor area map"
            loading="lazy">
          </iframe>
        </div>

        <!-- Donor cards or empty/welcome states -->
        <% if (count > 0) { %>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <% donors.forEach(function(donor) { %>
              <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div class="flex justify-between items-start mb-3">
                  <h4 class="font-bold text-gray-900 text-base"><%= donor.name %></h4>
                  <span class="blood-badge ml-2 shrink-0"><%= donor.blood_group %></span>
                </div>
                <% if (donor.email) { %>
                  <p class="text-sm text-gray-500 mb-1 truncate"><%= donor.email %></p>
                <% } %>
                <% if (donor.address) { %>
                  <p class="text-sm text-gray-600 mb-4 leading-relaxed"><%= donor.address %></p>
                <% } %>
                <div class="flex justify-between items-center pt-3 border-t border-gray-100">
                  <span class="text-sm text-gray-500">
                    📍 <%= Number(donor.distance_km).toFixed(1) %>km away
                  </span>
                  <a href="tel:<%= donor.phone %>"
                     class="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold
                            no-underline hover:bg-red-700 hover:-translate-y-px transition-all">
                    📞 Call
                  </a>
                </div>
              </div>
            <% }); %>
          </div>

        <% } else if (query.location) { %>
          <!-- Empty state -->
          <div class="text-center py-16">
            <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <h3 class="text-xl font-bold text-gray-900 mb-2">No donors found</h3>
            <p class="text-gray-600 max-w-md mx-auto">
              No blood donors found near "<%= query.location %>". Try a different location or expand the radius.
            </p>
          </div>

        <% } else { %>
          <!-- Welcome state — no search performed yet -->
          <div class="text-center py-16">
            <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <h3 class="text-xl font-bold text-gray-900 mb-2">Search for Donors</h3>
            <p class="text-gray-600">Enter a location above to find nearby donors.</p>
          </div>
        <% } %>

      </div>
    </section>

  </main>

  <footer class="bg-gray-800 text-gray-300 py-8 text-center">
    <p class="text-sm">© 2026 BloodConnect. All rights reserved.</p>
  </footer>

</body>
</html>
```

---

## Step 8 — Update the HTML Form `action` Attributes

Every `<form>` in your static HTML files must point to the new routes:

### `index.html` — search form
```html
<!-- Before -->
<form action="search.html" method="GET">

<!-- After — points to the server route that geocodes + queries PostGIS -->
<form action="/search" method="GET">
```

### `login.html` — login form
```html
<!-- Before -->
<form action="/api/auth/login" method="POST">

<!-- After — the new session-based route -->
<form action="/login" method="POST">
```

### `register.html` — register form
```html
<!-- Before -->
<form action="/api/auth/register" method="POST">

<!-- After -->
<form action="/register" method="POST">
```

### Header logout link (in `index.html` and `search.ejs`)
```html
<!-- Before (Vue) -->
<button @click="handleLogout">Logout</button>

<!-- After -->
<a href="/logout">Logout</a>
```

---

## Step 9 — Show Error Messages in Static HTML Pages Using URL Query Params

Since the backend redirects back to the form on errors (e.g., `login.html?error=invalid_credentials`), the HTML page needs to show the error. There are two ways to do this without JavaScript:

### Option A: CSS `:target` — zero JS, no server rendering needed

Add a hidden anchor `<div id="error-invalid-credentials">` in the page, and when the URL contains `#error-invalid-credentials` the div becomes visible via `:target`:

```html
<!-- In login.html -->
<style>
  .error-box { display: none; }
  .error-box:target { display: block; }
</style>

<div id="error-invalid_credentials" class="error-box bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm">
  Invalid email or password. Please try again.
</div>
<div id="error-missing_fields" class="error-box bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm">
  Please fill in all required fields.
</div>
```

Change the backend redirects to use `#` anchors instead of `?` query params:

```ts
// In pages.ts — use hash fragment instead of query param
return res.redirect("/login.html#error-invalid_credentials");
```

When the browser navigates to `login.html#error-invalid_credentials`, CSS `:target` activates the matching `<div>` and shows it. No JavaScript at all.

### Option B: Use EJS for all pages (slightly more work, more flexible)

Convert `login.html` and `register.html` into `.ejs` templates too. Add `GET /login` and `GET /register` routes that render them, passing an optional `error` variable from the query string:

```ts
// In pages.ts
router.get("/login", (req, res) => {
  res.render("login", { error: req.query.error || null });
});
```

In `login.ejs`:
```html
<% if (error) { %>
  <div class="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm">
    <%= error === 'invalid_credentials' ? 'Invalid email or password.' : 'Please fill in all fields.' %>
  </div>
<% } %>
```

**Recommendation:** Option A (`:target`) for zero-JS, Option B for better control.

---

## Step 10 — Show Login State in `index.html` (the Static Home Page)

The home page is a static file — it can't know if the user is logged in. There are two solutions:

### Option A: Move `index.html` to an EJS template

Rename to `index.ejs`, add a `GET /` route:

```ts
// In pages.ts
router.get("/", (req, res) => {
  res.render("index", { user: req.session.user || null });
});
```

Remove `index.html` from the static frontend folder (Express would serve the static file before reaching the route otherwise). The EJS template conditionally renders the Profile card or Login button exactly like the current Vue app does.

### Option B: Keep `index.html` static, accept the limitation

The header on `index.html` always shows the Login button. After logging in, the user is redirected to `/` where they see the Login button again. The profile is only accessible at `/profile`. Acceptable for a simple app.

**Recommendation:** Option A gives the closest experience to the current Vue app.

---

## Complete Request Flow Diagrams

### Before (Vue + JSON API)

```
Browser (Vue) ──── fetch POST /api/auth/login (JSON) ────► Express
              ◄─── 200 { user, token } (JSON) ────────────
Browser stores token in localStorage
Next request: Authorization: Bearer <token> header
```

### After (HTML + Sessions)

```
Browser (HTML form) ── POST /login (form-urlencoded) ──► Express
                     Express verifies password
                     Express writes userId to session in PostgreSQL
                     Express sets "bloodconnect.sid" cookie in browser
                   ◄── 302 Redirect: / ──────────────────────────

Next request: Cookie: bloodconnect.sid=abc123 ──────────► Express
                     Express reads session from PostgreSQL
                     req.session.user is populated automatically
                   ◄── HTML page with user data rendered in ──────
```

### Search Flow Before (Vue + JSON API)

```
Browser (Vue) ──── LocationSearch asks Nominatim API (browser-to-Nominatim)
              ◄─── { lat, lng }
              ──── fetch GET /api/donors?lat=40.7&lng=-74.0&blood_group=O%2B
              ◄─── JSON array of donors
              Vue renders donor cards into DOM
```

### Search Flow After (HTML + Server Route)

```
Browser ──── GET /search?location=New+York&blood_group=O%2B ──► Express
                   Express calls Nominatim (server-to-Nominatim)
                   Express runs PostGIS SQL query
                   Express renders search.ejs with donor data
             ◄──── Full HTML page with donor cards already in it ─
```

---

## How the Static Files Are Served

After adding `express.static(frontendPath)`, Express serves files from the `frontend/` folder directly:

| Browser Request | What happens |
|---|---|
| `GET /` | Serves `frontend/index.html` |
| `GET /login.html` | Serves `frontend/login.html` |
| `GET /register.html` | Serves `frontend/register.html` |
| `GET /css/output.css` | Serves `frontend/css/output.css` |
| `GET /leaflet/images/marker-icon.png` | Serves `frontend/public/leaflet/images/marker-icon.png` |
| `GET /search` | Hits the `/search` route in `pages.ts` (not a static file) |
| `POST /login` | Hits the `/login` route in `pages.ts` |
| `GET /api/donors/all` | Hits the existing `donors.ts` router (unchanged) |

The ordering in `server.ts` matters:
1. `express.static()` runs first — serves files if they exist
2. If no file matches, falls through to the route handlers
3. `/search`, `/login`, `/register`, `/logout` are route handlers, not static files, so they always reach `pages.ts`

---

## CORS Configuration After the Change

The current backend has `app.use(cors())` which allows all origins. After this change:

- The HTML frontend and the backend run on the **same origin** (`localhost:4000` serves both the HTML and the API)
- CORS is no longer needed for the HTML frontend to talk to its own backend
- Update to restrict CORS only for external API clients:

```ts
// In server.ts — more restrictive in production
app.use(cors({
  origin: process.env.CORS_ORIGIN || false,   // set to your domain in production
  credentials: true                            // allow session cookies cross-origin if needed
}));
```

In development, `CORS_ORIGIN` is unset, so `origin: false` means same-origin only (no CORS header sent).

---

## No More Vite Dev Server

With the Vue frontend, two servers ran in parallel:
- Vite dev server at `localhost:5173` (served the Vue app)
- Express at `localhost:4000` (the API)
- Vite proxied `/api/*` to Express

Now only one server runs: **Express at `localhost:4000`**. It serves both the HTML/CSS files and handles all routes. Open `http://localhost:4000` directly. No proxy needed.

Build the Tailwind CSS separately in a watch terminal:
```bash
# Terminal 1 — build CSS automatically when you change HTML/CSS files
cd frontend
npx tailwindcss -i ./src/styles/main.css -o ./css/output.css --watch

# Terminal 2 — run the backend (serves everything)
cd backend
npm run dev
```

---

## Updated `backend/.env`

```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/bloodconnect

JWT_SECRET=your-jwt-secret-keep-for-json-api
JWT_REFRESH_SECRET=your-refresh-secret-keep-for-json-api

# New — for HTML session cookies
SESSION_SECRET=generate-a-new-64-char-random-string-here

PORT=4000
NODE_ENV=development
```

---

## Summary of All Files to Create or Change

| File | Action | What changes |
|---|---|---|
| `backend/src/server.ts` | Modify | Add urlencoded, session, static middleware; mount pages router; add EJS config |
| `backend/src/routes/pages.ts` | Create (new) | All HTML form handlers + search + profile + logout routes |
| `backend/src/views/search.ejs` | Create (new) | Server-rendered search results page |
| `backend/src/views/index.ejs` | Create (optional) | Dynamic home page if you want login state in header |
| `backend/src/views/login.ejs` | Create (optional) | If using EJS for error display instead of `:target` CSS trick |
| `backend/src/views/register.ejs` | Create (optional) | Same as above |
| `backend/src/views/profile.ejs` | Create (new) | Authenticated user profile page |
| `backend/src/db/add_sessions_table.sql` | Create (new) | SQL to create the `session` table |
| `backend/.env` | Modify | Add `SESSION_SECRET` |
| `frontend/index.html` | Modify | Change search form action to `/search` |
| `frontend/login.html` | Modify | Change form action to `/login`; add error `<div>` elements |
| `frontend/register.html` | Modify | Change form action to `/register`; add error divs |
| `frontend/css/output.css` | Build output | Run `npx tailwindcss` to generate this |
| `backend/src/routes/auth.ts` | No change | JSON API stays untouched |
| `backend/src/routes/donors.ts` | No change | JSON API stays untouched |
| `backend/src/db/pool.ts` | No change | Pool used by session store automatically |
