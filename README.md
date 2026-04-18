# BloodConnect

A full-stack blood donor finder web application. Users can register as blood donors, search for nearby donors by blood group and location, and view donors on an interactive map. Authentication is built in — a registered donor is also a user account.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Project Structure](#2-project-structure)
3. [Frontend](#3-frontend)
   - [Tech Stack](#31-tech-stack)
   - [Entry Point & Bootstrap](#32-entry-point--bootstrap)
   - [Component Architecture](#33-component-architecture)
   - [Composables (Business Logic)](#34-composables-business-logic)
   - [Styling System](#35-styling-system)
   - [Map & Geocoding](#36-map--geocoding)
   - [Build & Configuration](#37-build--configuration)
4. [Backend](#4-backend)
   - [Tech Stack](#41-tech-stack)
   - [Server Setup](#42-server-setup)
   - [Database](#43-database)
   - [API Routes](#44-api-routes)
   - [Authentication System](#45-authentication-system)
   - [Configuration & Environment](#46-configuration--environment)
   - [Tooling](#47-tooling)
5. [Frontend ↔ Backend Connection](#5-frontend--backend-connection)
   - [Dev Proxy](#51-dev-proxy)
   - [API Layer](#52-api-layer)
   - [Auth State Management](#53-auth-state-management)
6. [Full Request Lifecycles](#6-full-request-lifecycles)
   - [Register a Donor](#61-register-a-donor)
   - [Login](#62-login)
   - [Search for Donors](#63-search-for-donors)
7. [Running the Project](#7-running-the-project)
   - [Prerequisites](#71-prerequisites)
   - [Database Setup](#72-database-setup)
   - [Backend](#73-backend)
   - [Frontend](#74-frontend)
8. [Environment Variables](#8-environment-variables)
9. [Key Design Decisions & Known Limitations](#9-key-design-decisions--known-limitations)
10. [Future Modification Guide](#10-future-modification-guide)

---

## 1. Project Overview

BloodConnect is a single-page application (SPA) that:

- Lets people **register as blood donors**, providing their blood group and exact GPS coordinates (picked via an OpenStreetMap autocomplete).
- Lets anyone **search for nearby donors** filtered by blood group and geographic radius using real PostGIS spatial queries.
- Displays search results on a **Leaflet interactive map** alongside a list of donor cards with contact details.
- Handles **user authentication** (register, login, JWT-based sessions, token refresh) allowing donors to manage their own profile.

The architecture is a classic **decoupled SPA + REST API**:

```
Browser (Vue 3 SPA, port 5173 in dev)
        ↕  HTTP JSON  (Vite proxy in dev / direct in prod)
Express 5 REST API  (port 4000)
        ↕  SQL
PostgreSQL + PostGIS extension
```

---

## 2. Project Structure

```
bloodConnect/
├── README.md
├── test-register.json          # Manual test payload for the register endpoint
│
├── frontend/                   # Vue 3 SPA
│   ├── index.html              # HTML shell — mounts #app
│   ├── main.ts                 # App entry point
│   ├── app.vue                 # Root component (layout, routing state, orchestration)
│   ├── vite.config.ts          # Vite config — plugins, proxy, aliases
│   ├── tailwind.config.js      # Tailwind content paths + custom colors/fonts
│   ├── postcss.config.js       # PostCSS pipeline (@tailwindcss/postcss + autoprefixer)
│   ├── tsconfig.json           # TypeScript config (strict, bundler resolution)
│   ├── vite-env.d.ts           # Vite/Vue type declarations
│   ├── package.json
│   │
│   ├── components/             # Reusable Vue components
│   │   ├── app.vue             # (see above — lives at root level, not here)
│   │   ├── ClientOnly.vue      # SSR guard — only renders after onMounted
│   │   ├── DonorForm.vue       # Two-step standalone donor registration form
│   │   ├── LeafletMap.vue      # Leaflet map with donor markers
│   │   ├── LocationSearch.vue  # Nominatim autocomplete input
│   │   ├── Login.vue           # Email/password login form
│   │   ├── MapView.vue         # Thin wrapper: ClientOnly → LeafletMap
│   │   ├── Register.vue        # Two-step user registration form
│   │   └── SearchDonors.vue    # Donor results grid + blood group filter
│   │
│   ├── composables/            # Reusable stateful logic (Vue Composition API)
│   │   ├── useApi.ts           # All donor-related API calls
│   │   └── useAuth.ts          # Auth state + auth API calls (singleton)
│   │
│   ├── plugins/
│   │   └── leaflet.client.ts   # Leaflet icon fix (currently unused — fix is inline)
│   │
│   ├── public/
│   │   └── leaflet/images/     # Leaflet marker PNG assets (served statically)
│   │
│   └── src/
│       └── styles/
│           └── main.css        # Global CSS: Tailwind directives + CSS custom props + component layer
│
└── backend/                    # Express REST API
    ├── package.json
    ├── biome.json              # Biome linter/formatter config
    ├── nodemon.json            # Nodemon dev-runner config
    ├── tsconfig.json           # TypeScript config
    │
    └── src/
        ├── server.ts           # Express app setup + route mounting + server start
        │
        ├── db/
        │   ├── pool.ts         # pg connection pool (reads DATABASE_URL)
        │   ├── schema.sql      # Initial table + PostGIS extension + indexes
        │   ├── add_auth_columns.sql  # Migration: add password_hash, unique email
        │   └── migrate.ts      # Migration runner script
        │
        ├── routes/
        │   ├── auth.ts         # /api/auth/* — register, login, profile, refresh
        │   └── donors.ts       # /api/donors/* — create, search, get all
        │
        └── types/
            └── index.ts        # Shared TypeScript interfaces and enums
```

---

## 3. Frontend

### 3.1 Tech Stack

| Technology | Version | Role |
|---|---|---|
| **Vue 3** | ^3.3.8 | UI framework — Composition API, `<script setup>` syntax throughout |
| **TypeScript** | ^5.2.2 | Language — strict mode enabled |
| **Vite** | ^4.5.2 | Build tool and dev server with HMR |
| **Tailwind CSS** | ^4.2.1 | Utility-first CSS framework |
| **@tailwindcss/postcss** | ^4.2.1 | Tailwind's PostCSS plugin (v4 uses this instead of the old `tailwindcss` PostCSS plugin) |
| **autoprefixer** | ^10.4.27 | Vendor-prefixes CSS for browser compatibility |
| **Leaflet** | ^1.9.4 | Interactive maps (client-side only) |
| **@vueuse/core** | ^10.5.0 | Vue utility composables (available, lightly used) |

### 3.2 Entry Point & Bootstrap

```
index.html  →  main.ts  →  app.vue  →  #app div
```

**`index.html`** is a minimal shell with a single `<div id="app">` and a `<script type="module" src="/main.ts">` tag. Vite processes this file.

**`main.ts`** bootstraps the app:
```ts
import { createApp } from 'vue'
import App from './app.vue'
import 'leaflet/dist/leaflet.css'   // Leaflet styles loaded globally
import './src/styles/main.css'      // Tailwind + global styles

createApp(App).mount('#app')
```

No Vue Router, no Pinia/Vuex. Navigation between "pages" is done via a `currentSection` ref inside `app.vue`.

### 3.3 Component Architecture

All components use Vue 3's `<script setup lang="ts">` syntax (Composition API). There are no Options API components.

#### `app.vue` — Root Orchestrator

This is the most complex file. It acts as both the main layout and the top-level state manager.

**Responsibilities:**
- Renders the full page layout: fixed header, hero section, results section, "How It Works", statistics, CTA, footer.
- Manages the **auth modal** — a dropdown from the header that shows one of three views: `options` (choose register or login), `login`, `register`. When authenticated, this area shows the user's profile card.
- Owns the **search state**: `searchForm` (blood group + location), `allDonors` (fetched on mount), `filteredDonors` (result of search).
- Performs **client-side Haversine distance filtering** on `allDonors` as a fast local fallback, while also triggering a server-side PostGIS search via `useApi`.
- On `onMounted`, fetches all donors and centers the map on their average coordinates.

**Key state:**
```ts
const { user, isAuthenticated, logout } = useAuth()      // auth singleton
const { getAllDonors } = useApi()                         // donor API

const showAuthModal = ref<boolean>(false)
const activeView = ref<'options' | 'login' | 'register'>('options')
const showResults = ref<boolean>(false)
const allDonors = ref<Donor[]>([])
const filteredDonors = ref<Donor[]>([])
const searchForm = reactive({ bloodGroup: '', location: null })
const mapCenter = reactive({ lat: 40.7128, lng: -74.0060 })  // NYC default
```

#### `components/Login.vue`

Simple two-field form (email + password). Calls `useAuth().login()`. On success emits `login-success` to `app.vue` which closes the modal.

#### `components/Register.vue`

Two-step registration:
1. Step 1: name, email, password (min 6 chars), blood group, phone, address text field.
2. Step 2: `LocationSearch` component to pick exact GPS coordinates.

Calls `useAuth().register()`. Submit is disabled until lat/lng are set from step 2. Emits `register-success` or `switch-to-login`.

#### `components/DonorForm.vue`

A standalone two-step donor registration form (name, blood group, phone, email, address → then `LocationSearch`). Uses `useApi().createDonor()`, which hits the unauthenticated `POST /api/donors` endpoint. This is separate from `Register.vue` and represents a "quick donate without account" flow. Emits `donor-saved` on success.

#### `components/SearchDonors.vue`

Displays donor search results. Accepts optional props (`showMap`, `showFilters`, `showSearchButton`, `showLocationInfo`) to control visibility of UI elements — designed to be embeddable in multiple contexts.

Internally calls `useApi().searchDonors()` with blood group filter and 10 km default radius. Renders a responsive grid (1 col mobile / 2 col tablet / 3 col desktop) of donor cards showing name, blood group badge, email, address, distance, and a `tel:` call link.

Three UI states:
- **Welcome** — user hasn't searched yet.
- **Empty** — search returned no results.
- **Results grid** — donor cards rendered.

Exposes `updateLocation(location)` via `defineExpose` so the parent can imperatively trigger a new search when location changes.

#### `components/LocationSearch.vue`

Autocomplete location picker backed by the **Nominatim OpenStreetMap API** (free, no API key). Behavior:
- Debounces input 300ms.
- Requires min 2 characters before querying.
- Keyboard navigable (arrow up/down, enter to select, escape to close).
- Closes dropdown on outside click via `document.addEventListener`.
- Emits `location-selected` with `{ lat, lng, address }`.

No backend involved — this is a direct browser-to-Nominatim call.

#### `components/LeafletMap.vue`

The actual map implementation. Key details:
- Leaflet is **dynamically imported inside `onMounted`** to avoid SSR/bundler failures (Leaflet assumes `window` exists).
- Applies the bundler icon-path fix inline (deletes `_getIconUrl`, merges correct PNG paths from `/public/leaflet/images/`).
- Renders a **blue `divIcon`** at the search center point.
- Renders a **red `divIcon`** for each donor with a popup containing name, blood group, address, distance, and `tel:`/`mailto:` action links.
- Watches `props.center` and `props.donors` — re-renders markers reactively.
- Calls `featureGroup.fitBounds()` to auto-zoom the map to show all markers.
- Cleans up the Leaflet instance on `onUnmounted` to prevent memory leaks.

#### `components/MapView.vue`

A one-purpose wrapper:
```vue
<ClientOnly>
  <LeafletMap :center="center" :donors="donors" />
  <template #fallback><div class="loading-spinner" /></template>
</ClientOnly>
```
Exists to cleanly separate the `ClientOnly` boundary from the map logic.

#### `components/ClientOnly.vue`

An SSR hydration guard. Uses a `mounted` ref set to `true` in `onMounted`. Shows the default slot only after the component has mounted on the client. Shows the `#fallback` slot during server rendering or before mount. This prevents Leaflet (and anything touching `window`) from running during SSR.

### 3.4 Composables (Business Logic)

#### `composables/useApi.ts`

Handles all donor-related HTTP calls. Each call to `useApi()` returns **fresh, isolated** `loading` and `error` refs — there is no shared API state.

```ts
const useApi = () => {
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)

  // POST /api/donors  — unauthenticated donor creation
  const createDonor = async (data: CreateDonorData): Promise<Donor>

  // GET /api/donors?lat=&lng=&blood_group=&radius_km=  — PostGIS spatial search
  const searchDonors = async (params: SearchParams): Promise<Donor[]>

  // GET /api/donors/all  — fetch up to 500 donors (used to pre-load map)
  const getAllDonors = async (): Promise<Donor[]>

  return { createDonor, searchDonors, getAllDonors, loading, error }
}
```

Base URL: `import.meta.env.VITE_API_BASE || ''` — empty string means relative URLs, which hit the Vite dev proxy. In production, set `VITE_API_BASE` to the full backend URL.

#### `composables/useAuth.ts`

Handles authentication state and all auth-related API calls. Uses a **module-level singleton pattern**: `user`, `token`, `refreshToken` are declared at module scope (outside the exported function), so all components share the same reactive state.

```ts
// Module-level — shared across all component instances
const user = ref<User | null>(null)
const token = ref<string | null>(null)
const refreshToken = ref<string | null>(null)

// Called once when the module is first imported
initAuth()  // reads localStorage → populates refs if a session exists

export const useAuth = () => {
  const isAuthenticated = computed(() => !!user.value && !!token.value)

  login(credentials)            // POST /api/auth/login
  register(data)                // POST /api/auth/register  
  logout()                      // clears refs + localStorage (no server call)
  refreshAccessToken()          // POST /api/auth/refresh
  updateUserProfile(updates)    // PUT /api/auth/profile  (sends Bearer token)

  return { user, token, refreshToken, isAuthenticated,
           loading, error, login, register, logout,
           updateUserProfile, refreshAccessToken }
}
```

**localStorage keys used:**
- `auth_token` — JWT access token
- `auth_refresh_token` — JWT refresh token
- `auth_user` — JSON-serialized user object

### 3.5 Styling System

The project uses a **hybrid styling approach**:

1. **Tailwind CSS v4** — utility classes for layout, spacing, flex/grid, responsive breakpoints (e.g., `md:grid-cols-2`, `p-4`, `rounded-lg`).

2. **Scoped `<style>` blocks** — each component has a `<style scoped>` section with component-specific CSS. `app.vue` alone has ~400 lines of scoped CSS.

3. **Global component layer** (`src/styles/main.css`) — defines reusable class names in Tailwind's `@layer components`:
   - `.blood-badge` — pill badge for blood group display
   - `.btn-primary` — red button with lift/shadow hover effect
   - `.btn-secondary` — white button with red border
   - `.form-input` — standard input with red focus ring
   - `.card` — white card with shadow

4. **CSS custom properties** (defined in `:root` in `main.css` and used via `var()`):
   ```css
   --primary-red: #dc2626;
   --primary-red-dark: #b91c1c;
   --primary-red-light: #f87171;
   --gray-50 through --gray-900
   ```

5. **Custom Tailwind color** — `blood-red` palette (50–950 shades) defined in `tailwind.config.js` extending the default theme.

### 3.6 Map & Geocoding

**Leaflet** (`leaflet` npm package) is used for interactive maps. Because Leaflet directly accesses browser APIs (`window`, `document`) it cannot run during SSR or module initialization. The solution is two-layered:
1. `ClientOnly.vue` prevents the component from mounting server-side.
2. `LeafletMap.vue` uses `import('leaflet')` (dynamic import) inside `onMounted`.

**Nominatim** (OpenStreetMap's free geocoding API) is used for location autocomplete in `LocationSearch.vue`. The browser directly calls `https://nominatim.openstreetmap.org/search?q=...&format=json&limit=5`. No API key is required. This is subject to Nominatim's usage policy (max 1 request/second, must have a proper User-Agent in production).

Leaflet marker icons are served from `/public/leaflet/images/` (PNG files committed to the repo). Vite serves the `public/` directory as static assets at `/`.

### 3.7 Build & Configuration

**`vite.config.ts`:**
```ts
export default defineConfig({
  plugins: [vue()],             // Vue SFC compilation
  define: { global: 'globalThis' },  // polyfill for packages using `global`
  resolve: { alias: { '@': '/src' } },  // @/ path alias
  server: {
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true }
    }
  }
})
```

**`tsconfig.json`** highlights:
- `"moduleResolution": "bundler"` — uses Vite's module resolution (allows `.ts` imports without extensions).
- `"strict": true` — full TypeScript strictness.
- `"allowImportingTsExtensions": true` — allows `import './composables/useApi.ts'` with explicit extension.
- `"noEmit": true` — TypeScript does not compile; Vite handles transpilation.

**PostCSS pipeline** (`postcss.config.js`):
```js
// @tailwindcss/postcss processes Tailwind v4 directives
// autoprefixer adds vendor prefixes automatically
export default {
  plugins: [postcssPlugin(), autoprefixer()]
}
```

---

## 4. Backend

### 4.1 Tech Stack

| Technology | Version | Role |
|---|---|---|
| **Node.js** | — | Runtime (ESM: `"type": "module"`) |
| **Express** | ^5.2.1 | HTTP framework |
| **TypeScript** | ^5.9.3 | Language — strict mode |
| **PostgreSQL + PostGIS** | — | Relational DB + geospatial extension |
| **pg (node-postgres)** | ^8.18.0 | PostgreSQL client with connection pooling |
| **bcrypt** | ^6.0.0 | Password hashing (10 salt rounds) |
| **jsonwebtoken** | ^9.0.3 | JWT creation and verification |
| **dotenv** | ^17.2.3 | Environment variable loading from `.env` |
| **cors** | ^2.8.6 | Cross-Origin Resource Sharing middleware |
| **Biome** | ^2.3.14 | Linter + formatter (replaces ESLint + Prettier) |
| **nodemon** | ^3.1.11 | Dev file watcher |
| **ts-node** | ^10.9.2 | TypeScript execution via `--loader ts-node/esm` |

### 4.2 Server Setup

**`src/server.ts`** is the entry point:

```ts
const app = express()
app.use(cors())            // Allow all origins (configure in production)
app.use(express.json())    // Parse JSON request bodies

// Health check — useful for load balancers / uptime monitors
app.get('/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString(), uptime: process.uptime() })
})

app.use('/api/donors', donors)    // routes/donors.ts
app.use('/api/auth', auth)        // routes/auth.ts

app.listen(process.env.PORT || 4000)
```

### 4.3 Database

**Engine:** PostgreSQL with the **PostGIS** extension. PostGIS adds spatial data types, functions, and indexes to PostgreSQL.

#### Schema

```sql
-- Enable PostGIS spatial extension
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE donors (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  blood_group   TEXT NOT NULL,          -- 'A+', 'O-', 'AB+', etc.
  phone         TEXT NOT NULL,
  email         TEXT UNIQUE,            -- used as the login username
  password_hash TEXT,                   -- NULL for unauthenticated donors
  address       TEXT,
  lat           DOUBLE PRECISION NOT NULL,
  lng           DOUBLE PRECISION NOT NULL,
  location      GEOGRAPHY(Point, 4326) NOT NULL,  -- PostGIS spatial column
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Standard B-tree index for blood group filtering
CREATE INDEX donors_blood_group_idx ON donors (blood_group);

-- GIST spatial index — makes ST_DWithin and ST_Distance fast
CREATE INDEX donors_location_gix ON donors USING GIST (location);
```

**Key schema decision:** donors and users share one table. Registering an account creates a donor row with a `password_hash`. Anonymous donors (via `POST /api/donors`) have `password_hash = NULL` and cannot log in.

**`GEOGRAPHY(Point, 4326)`** stores coordinates using WGS84 (standard GPS coordinate system). Using `GEOGRAPHY` instead of `GEOMETRY` means distance calculations automatically use meters on the Earth's curved surface without projection math.

#### Connection Pool (`src/db/pool.ts`)

```ts
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                      // max simultaneous connections
  idleTimeoutMillis: 30000,     // release idle connections after 30s
  connectionTimeoutMillis: 2000 // fail fast if can't connect in 2s
})
```

All routes import this shared pool and call `pool.query(sql, params)`. Never builds SQL by string concatenation — all dynamic values use parameterized queries (`$1`, `$2`, ...) to prevent SQL injection.

#### Migration System

Two SQL files + a migration runner script:

- **`schema.sql`** — run once to create the initial schema (use for a fresh database).
- **`add_auth_columns.sql`** — adds `password_hash` column and enforces email uniqueness. Run after the initial schema if upgrading an existing database.
- **`migrate.ts`** — a Node script that reads `add_auth_columns.sql` and executes it. Run with: `node --loader ts-node/esm src/db/migrate.ts`.

### 4.4 API Routes

#### `GET /health`
Returns server status. No authentication required.
```json
{ "ok": true, "timestamp": "2026-04-13T10:00:00.000Z", "uptime": 3600.12 }
```

---

#### `POST /api/donors`
Create a donor **without** authentication (legacy/quick-add flow).

**Request body:**
```json
{
  "name": "Jane Doe",
  "blood_group": "O+",
  "phone": "+1234567890",
  "email": "jane@example.com",  // optional
  "address": "123 Main St",     // optional
  "lat": 40.7128,
  "lng": -74.0060
}
```
**Response:** `201` with the created donor row. Stores PostGIS point via `ST_SetSRID(ST_MakePoint(lng, lat), 4326)`.

---

#### `GET /api/donors/all`
Fetch up to 500 donors (no location filter). Used by the frontend to pre-load all donors for the map on app startup.

**Response:** Array of donor objects (id, name, blood_group, phone, email, address, lat, lng).

> **Note:** This route must be declared **before** `GET /api/donors/` in the router, otherwise Express would try to match `"all"` as a dynamic `:id` parameter.

---

#### `GET /api/donors?lat=&lng=&blood_group=&radius_km=`
Spatial donor search using PostGIS.

**Query parameters:**
| Param | Required | Default | Description |
|---|---|---|---|
| `lat` | Yes | — | Search center latitude |
| `lng` | Yes | — | Search center longitude |
| `blood_group` | No | — | Filter by blood group (e.g., `O+`) |
| `radius_km` | No | 10 | Search radius in kilometers |

**SQL executed:**
```sql
SELECT *, ST_Distance(location, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) / 1000 AS distance_km
FROM donors
[WHERE blood_group = $3]
[AND/WHERE] ST_DWithin(location, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $N * 1000)
ORDER BY distance_km ASC
LIMIT 100;
```
`ST_DWithin` uses the spatial GIST index for fast radius filtering. `ST_Distance` returns meters, divided by 1000 for km. Results are sorted nearest-first.

---

#### `POST /api/auth/register`
Register a new user/donor account.

**Request body:**
```json
{
  "name": "John Smith",
  "email": "john@example.com",
  "password": "secretpassword",
  "blood_group": "A+",
  "phone": "+1234567890",
  "address": "456 Oak Ave",
  "lat": 40.7128,
  "lng": -74.0060
}
```
**Steps:** validate fields → check email uniqueness → `bcrypt.hash(password, 10)` → insert donor row → return `{ user, token, refreshToken }`.

**Response:** `201`
```json
{
  "user": { "id": 1, "name": "John Smith", "email": "john@example.com", "blood_group": "A+", ... },
  "token": "eyJhbGci...",
  "refreshToken": "eyJhbGci..."
}
```

---

#### `POST /api/auth/login`
Authenticate an existing user.

**Request body:** `{ "email": "john@example.com", "password": "secretpassword" }`

**Steps:** look up by email → `bcrypt.compare(password, hash)` → if match, generate tokens → return `{ user, token, refreshToken }`.

Uses the same `401` response for both "email not found" and "wrong password" (avoids user enumeration).

---

#### `GET /api/auth/profile`
Fetch the authenticated user's profile.

**Headers:** `Authorization: Bearer <token>`

Verifies the JWT, extracts `userId` from the payload, fetches the donor row.

---

#### `PUT /api/auth/profile`
Update the authenticated user's profile fields.

**Headers:** `Authorization: Bearer <token>`

**Request body (all optional):** `{ "name", "phone", "address", "blood_group" }`

Uses `COALESCE($1, name)` so omitted fields keep their current value.

---

#### `POST /api/auth/refresh`
Exchange a valid refresh token for a new access token + refresh token pair.

**Request body:** `{ "refreshToken": "eyJhbGci..." }`

Verifies the refresh JWT using `JWT_REFRESH_SECRET`. Issues fresh tokens. Refresh tokens are **not stored** server-side — they cannot be revoked before expiry.

---

### 4.5 Authentication System

The auth system is **stateless JWT-based**:

```
User logs in → server issues access token (15 min) + refresh token (7 days)
                                                   ↓
                                          Stored in localStorage
                                                   ↓
Each protected request → Authorization: Bearer <access_token>
                                                   ↓
Server verifies signature + expiry (no DB lookup)
```

**Token details:**
- Access token: signed with `JWT_SECRET`, expires in `JWT_EXPIRES_IN` (default 15 min).
- Refresh token: signed with `JWT_REFRESH_SECRET`, expires in `JWT_REFRESH_EXPIRES_IN` (default 7 days).
- Payload: `{ userId: number }`.
- Both secrets should be different, random, min 32 characters in production.

**Password hashing:** bcrypt with 10 salt rounds. `bcrypt.hash()` on write, `bcrypt.compare()` on verify — the plaintext password is never stored.

### 4.6 Configuration & Environment

The backend reads configuration exclusively from environment variables via `dotenv`:

| Variable | Required | Default (insecure) | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | hardcoded fallback string | JWT signing secret for access tokens |
| `JWT_REFRESH_SECRET` | Yes | hardcoded fallback string | JWT signing secret for refresh tokens |
| `JWT_EXPIRES_IN` | No | `15m` | Access token expiry (ms/zeit format) |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token expiry |
| `PORT` | No | `4000` | HTTP server port |

Create a `.env` file in the `backend/` directory (never commit this to version control):
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/bloodconnect
JWT_SECRET=some-long-random-string-at-least-32-chars
JWT_REFRESH_SECRET=another-long-random-string-different-from-above
PORT=4000
```

### 4.7 Tooling

**Biome** replaces ESLint and Prettier in one tool. Configured via `biome.json`. Run:
```bash
npm run lint      # check for issues
npm run format    # auto-format source files
npm run build     # runs biome check + format + tsc compilation
```

**Nodemon** (`nodemon.json`) watches `src/` for `.ts` and `.json` changes and restarts automatically using:
```json
{ "exec": "node --loader ts-node/esm src/server.ts" }
```
`--loader ts-node/esm` allows Node.js to execute TypeScript files directly without a prior compile step. This is development-only.

**Production build:**
```bash
npm run build     # tsc compiles src/ → dist/
npm start         # node dist/server.js
```

---

## 5. Frontend ↔ Backend Connection

### 5.1 Dev Proxy

In development, the Vite dev server intercepts any request starting with `/api` and forwards it to `http://localhost:4000`. This means:

- The browser only talks to one origin (`localhost:5173`).
- No CORS configuration is needed during development.
- API calls in the frontend use relative paths (e.g., `fetch('/api/donors/all')`).

```
Browser → GET /api/donors/all → Vite Dev Server → forwards → Express :4000
                                                            ← response ←
          ← response ←
```

In production, you'd either:
- Serve both from the same domain (nginx reverse proxy).
- Or set `VITE_API_BASE=https://api.yourdomain.com` in a `.env.production` file, and ensure the Express server has CORS configured to allow your frontend origin.

### 5.2 API Layer

`useApi.ts` is the single abstraction over all donor HTTP calls. It uses native `fetch`:

```ts
const API_BASE = import.meta.env.VITE_API_BASE || ''

// Example:
const getAllDonors = async (): Promise<Donor[]> => {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(`${API_BASE}/api/donors/all`)
    if (!res.ok) throw new Error(await res.text())
    return await res.json()
  } catch (e) {
    error.value = String(e)
    return []
  } finally {
    loading.value = false
  }
}
```

For authenticated calls (`updateUserProfile`), `useAuth.ts` reads the token from its module-level ref and adds the `Authorization` header:
```ts
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token.value}`
}
```

### 5.3 Auth State Management

`useAuth.ts` uses a module-level singleton so all components share the same auth state without a global store like Pinia:

```
useAuth() called in app.vue    ─┐
useAuth() called in Login.vue  ─┼─→  same `user`, `token`, `refreshToken` refs
useAuth() called in Register.vue ─┘
```

On page load:
1. `useAuth.ts` module is imported → `initAuth()` runs once.
2. `initAuth()` reads `localStorage` for `auth_token` and `auth_user`.
3. If found, populates the module-level refs → all components immediately see `isAuthenticated = true`.

On login/register:
1. Component calls `useAuth().login(credentials)` or `.register(data)`.
2. `useAuth` makes the HTTP call, receives `{ user, token, refreshToken }`.
3. Updates module-level refs AND writes to `localStorage`.
4. All components reactively update (header shows profile, etc.).

On logout:
1. Component calls `useAuth().logout()`.
2. Refs set to `null`, `localStorage` keys removed.
3. No server call — the JWT simply becomes unused.

---

## 6. Full Request Lifecycles

### 6.1 Register a Donor

```
User fills Register.vue (step 1: credentials)
  → clicks "Next" → step 2: LocationSearch component appears

User types city/address in LocationSearch
  → browser calls Nominatim: GET https://nominatim.openstreetmap.org/search?q=...
  ← dropdown of matching locations

User selects a location
  → LocationSearch emits { lat, lng, address }
  → Register.vue stores lat/lng, enables Submit

User clicks Submit
  → useAuth().register({ name, email, password, blood_group, phone, address, lat, lng })
  → POST /api/auth/register  (JSON body)
    → Express validates fields
    → SELECT id FROM donors WHERE email = $1   (check uniqueness)
    → bcrypt.hash(password, 10)
    → INSERT INTO donors (name, email, password_hash, ..., ST_MakePoint(lng, lat))
    ← 201 { user: {...}, token: "eyJ...", refreshToken: "eyJ..." }
  → useAuth stores tokens in localStorage + module refs
  → emit('register-success')
  → app.vue closes auth modal
  → header reactively updates: shows user profile card
```

### 6.2 Login

```
User fills Login.vue (email + password)
  → useAuth().login({ email, password })
  → POST /api/auth/login
    → SELECT ... FROM donors WHERE email = $1
    → bcrypt.compare(password, password_hash)
    ← 200 { user: {...}, token: "eyJ...", refreshToken: "eyJ..." }
  → useAuth stores tokens + user
  → emit('login-success')
  → app.vue closes modal, header shows profile
```

### 6.3 Search for Donors

```
App mounts (onMounted in app.vue):
  → useApi().getAllDonors()
  → GET /api/donors/all
  ← up to 500 donors []
  → allDonors ref populated
  → mapCenter calculated from average lat/lng of all donors
  → LeafletMap renders all donor markers immediately

User picks blood group from dropdown + location from LocationSearch:
  → LocationSearch → Nominatim (external, no backend)
  → searchForm.location = { lat, lng, address }

User clicks Search button → app.vue: searchDonors()
  → Client-side: allDonors filtered by Haversine distance (10 km) → filteredDonors ref
  → Also: useApi().searchDonors({ lat, lng, blood_group, radius_km: 10 })
    → GET /api/donors?lat=40.71&lng=-74.00&blood_group=O%2B&radius_km=10
      → EXPRESS: parameterized SQL with ST_DWithin + ST_Distance
      → PostgreSQL uses GIST spatial index
      ← rows with distance_km sorted ASC, max 100 results
  → showResults.value = true

UI updates:
  → MapView → LeafletMap re-renders with filteredDonors markers + blue center marker
  → SearchDonors grid shows donor cards with distance
```

---

## 7. Running the Project

### 7.1 Prerequisites

- **Node.js** v18+ (ESM support required)
- **PostgreSQL** v14+ with the **PostGIS** extension installed
  ```bash
  # macOS (Homebrew)
  brew install postgresql postgis

  # Ubuntu/Debian
  sudo apt install postgresql postgresql-contrib postgis
  ```
- **npm** v9+

### 7.2 Database Setup

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE bloodconnect;"

# Run the schema (creates donors table + indexes)
psql -U postgres -d bloodconnect -f backend/src/db/schema.sql

# Verify PostGIS is enabled (it's in the schema.sql, but double-check)
psql -U postgres -d bloodconnect -c "SELECT PostGIS_Version();"
```

If you are **upgrading an existing database** that already has the `donors` table but lacks `password_hash`:
```bash
cd backend
node --loader ts-node/esm src/db/migrate.ts
```

### 7.3 Backend

```bash
cd backend

# Install dependencies
npm install

# Create environment config
cp .env.example .env     # if .env.example exists
# Or manually create backend/.env with the variables listed in Section 8

# Start development server (auto-restarts on file changes)
npm run dev

# The API is now available at http://localhost:4000
# Health check: curl http://localhost:4000/health
```

**Production:**
```bash
npm run build    # compiles TypeScript to dist/
npm start        # runs dist/server.js
```

### 7.4 Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# App is now available at http://localhost:5173
# All /api/* requests are proxied to http://localhost:4000
```

**Production build:**
```bash
npm run build      # outputs to frontend/dist/
npm run preview    # serves the dist/ build locally for testing
```

To deploy, serve the contents of `frontend/dist/` from any static file host (Netlify, Vercel, nginx, S3, etc.) and ensure the backend API is reachable.

---

## 8. Environment Variables

Create `backend/.env`:

```env
# PostgreSQL connection string
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/bloodconnect

# JWT secrets — must be long, random, different from each other
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=replace-with-64-char-random-hex-string
JWT_REFRESH_SECRET=replace-with-different-64-char-random-hex-string

# Token expiry (optional — these are the defaults)
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Server port (optional — defaults to 4000)
PORT=4000
```

Optionally create `frontend/.env.local` (only needed in production or to override the proxy):

```env
# Only set this if NOT using the Vite dev proxy (i.e. in production)
VITE_API_BASE=https://api.yourdomain.com
```

---

## 9. Key Design Decisions & Known Limitations

### Design Decisions

| Decision | Rationale |
|---|---|
| Donors and users share one table | A donor IS a user. Avoids JOINs and keeps the data model simple. |
| PostGIS for spatial queries | `ST_DWithin` with a GIST index is much faster than calculating Haversine in SQL. Scales to millions of rows. |
| Module-level singleton auth | Avoids needing Pinia/Vuex for a small app. All components reactively share the same `user`/`token` refs. |
| No Vue Router | The app is truly single-page with no deep-linkable routes. State-driven rendering is simpler at this scale. |
| Leaflet dynamic import | Leaflet accesses `window` at import time, which breaks Vite's build. Dynamic import inside `onMounted` is the standard fix. |
| Client-side Haversine + server PostGIS | The pre-loaded `allDonors` array enables instant client-side filtering for map markers; the server search ensures accurate results for the list view. |

### Known Limitations

1. **No automatic token refresh.** `refreshAccessToken()` exists in `useAuth` but is never called automatically. A 15-minute session timeout will silently fail any authenticated requests.

2. **Stateless refresh tokens.** Refresh tokens are signed JWTs not stored in the database. They cannot be invalidated server-side before their 7-day expiry (e.g., on logout, password change, or security incident).

3. **CORS is wide open.** `app.use(cors())` allows all origins. In production, restrict to your frontend domain: `app.use(cors({ origin: 'https://yourdomain.com' }))`.

4. **Hardcoded JWT secret fallbacks.** If `JWT_SECRET` is not set, the code falls back to a hardcoded string. In production, `server.ts` should throw an error if secrets are missing.

5. **`/api/donors` POST is unauthenticated.** Anyone can insert a donor record without an account. Consider adding auth middleware to this route if this is a concern.

6. **Duplicate donor creation paths.** `Register.vue` (authenticated) and `DonorForm.vue` (unauthenticated) both create donors, potentially creating orphan rows without login credentials.

7. **`plugins/leaflet.client.ts` is dead code.** The Leaflet icon fix it contains is not imported in `main.ts` — the same fix is applied inline in `LeafletMap.vue`. The plugin file can be removed.

8. **Statistics section is hardcoded.** The "1,247 donors, 3,421 lives saved, <15 min response" figures in the UI are static strings, not database-driven.

---

## 10. Future Modification Guide

### Adding a New API Endpoint

1. Decide which `src/routes/` file it belongs to (donors or auth), or create a new `src/routes/newFeature.ts`.
2. Add the route handler using `router.get/post/put/delete`.
3. Add any new TypeScript types to `src/types/index.ts`.
4. If new: mount the router in `src/server.ts` with `app.use('/api/newfeature', newFeature)`.

### Adding a New Frontend Page/View

Since there is no Vue Router, add a new value to the `currentSection` ref in `app.vue` and use `v-if="currentSection === 'newSection'"` in the template to show/hide it. Or install Vue Router:

```bash
cd frontend && npm install vue-router
```

Then wrap `app.vue`'s `<router-view>` and define routes in a new `frontend/router/index.ts`.

### Adding a New Vue Component

1. Create `frontend/components/MyComponent.vue` with `<script setup lang="ts">`.
2. Import it in the parent component: `import MyComponent from './components/MyComponent.vue'`.
3. No registration needed — `<script setup>` auto-registers imported components.

### Using Pinia for State Management

If the app grows and `useAuth.ts`'s singleton pattern becomes limiting:

```bash
cd frontend && npm install pinia
```

In `main.ts`: `createApp(App).use(createPinia()).mount('#app')`

Then convert `useAuth.ts` to a `defineStore`.

### Adding a New Database Column

1. Write an `ALTER TABLE` statement in a new SQL file under `backend/src/db/`.
2. Add the column to the `Donor` interface in `src/types/index.ts`.
3. Update relevant `SELECT`/`INSERT` queries in the routes.
4. Run the migration: `node --loader ts-node/esm src/db/migrate.ts` (update `migrate.ts` to point to the new file, or run the SQL directly with `psql`).

### Implementing Automatic Token Refresh

In `useAuth.ts`, create an `authFetch` wrapper that:
1. Tries the request.
2. If it receives a `401`, calls `refreshAccessToken()`.
3. Retries the original request with the new token.

Replace all direct `fetch` calls in `useAuth.ts` and `useApi.ts` with `authFetch`.

### Environment-Specific Frontend Builds

Vite supports `.env`, `.env.local`, `.env.production`, `.env.development`. Add:

```env
# frontend/.env.production
VITE_API_BASE=https://api.yourdomain.com
```

All `VITE_*` variables are statically injected at build time by Vite and accessible via `import.meta.env.VITE_*`.
