# Converting BloodConnect Frontend: Vue.js → Pure HTML + CSS

## Preface — The Honest Constraint

This document describes exactly how to convert every part of the BloodConnect frontend from Vue.js into pure HTML and CSS (using Tailwind CSS as the styling engine) with **zero JavaScript on the client side**.

It is important to state upfront: **this app cannot be 100% functionally identical without JavaScript**. Certain features — the interactive map, the Nominatim location autocomplete, the live donor search results, and the JWT authentication flow — are fundamentally JavaScript at their core. However, every single **visual layout, design element, color, spacing, typography, and structural section** can be reproduced exactly in pure HTML + CSS. The dynamic behaviors either move to the backend (as HTML form submissions), get replaced with CSS-only interaction techniques, or become gracefully degraded static states.

This document covers:
1. What currently relies on JavaScript and why
2. Which CSS-only techniques replace each piece of interactivity
3. The exact HTML structure and Tailwind classes for every section and component
4. How to restructure the backend to serve the dynamic parts as server-rendered HTML
5. A file-by-file migration plan

---

## Table of Contents

- [Converting BloodConnect Frontend: Vue.js → Pure HTML + CSS](#converting-bloodconnect-frontend-vuejs--pure-html--css)
  - [Preface — The Honest Constraint](#preface--the-honest-constraint)
  - [Table of Contents](#table-of-contents)
  - [1. Current JavaScript Dependencies — Full Inventory](#1-current-javascript-dependencies--full-inventory)
    - [Category A — Replaceable with CSS Only (no functionality lost)](#category-a--replaceable-with-css-only-no-functionality-lost)
    - [Category B — Must move to the backend (form submissions instead of fetch)](#category-b--must-move-to-the-backend-form-submissions-instead-of-fetch)
    - [Category C — Requires a static/fallback replacement (no perfect CSS-only substitute)](#category-c--requires-a-staticfallback-replacement-no-perfect-css-only-substitute)
  - [2. CSS-Only Interaction Toolkit](#2-css-only-interaction-toolkit)
    - [2.1 The Checkbox Hack — Modal Toggle](#21-the-checkbox-hack--modal-toggle)
    - [2.2 Radio Button Technique — Multi-View Switching](#22-radio-button-technique--multi-view-switching)
    - [2.3 CSS `:target` — Section Navigation](#23-css-target--section-navigation)
    - [2.4 Register Form Two-Step — Checkbox Technique](#24-register-form-two-step--checkbox-technique)
    - [2.5 Hover-Only Interactivity](#25-hover-only-interactivity)
  - [3. File Structure for the Static Version](#3-file-structure-for-the-static-version)
  - [4. Page Layout and Header (app.vue)](#4-page-layout-and-header-appvue)
    - [Full-Bleed Section Fix](#full-bleed-section-fix)
    - [Header HTML](#header-html)
  - [5. Auth Modal (Login / Register) — CSS-Only Tabs](#5-auth-modal-login--register--css-only-tabs)
  - [6. Hero Section and Search Form](#6-hero-section-and-search-form)
  - [7. Nearby Donors Section](#7-nearby-donors-section)
  - [8. How It Works Section](#8-how-it-works-section)
  - [9. Statistics Section](#9-statistics-section)
  - [10. CTA Section](#10-cta-section)
  - [11. Footer](#11-footer)
  - [12. Login Form (Login.vue)](#12-login-form-loginvue)
  - [13. Register Form (Register.vue)](#13-register-form-registervue)
  - [14. Donor Cards and Grid (SearchDonors.vue)](#14-donor-cards-and-grid-searchdonorsvue)
    - [Results Grid Template](#results-grid-template)
  - [15. DonorForm Component (DonorForm.vue)](#15-donorform-component-donorformvue)
  - [16. Map Placeholder (LeafletMap.vue → MapView.vue)](#16-map-placeholder-leafletmapvue--mapviewvue)
    - [Option A: OpenStreetMap Static Tile (iframe)](#option-a-openstreetmap-static-tile-iframe)
    - [Option B: Static Map Image (no interactivity)](#option-b-static-map-image-no-interactivity)
    - [Option C: Graceful placeholder](#option-c-graceful-placeholder)
  - [17. Location Search (LocationSearch.vue)](#17-location-search-locationsearchvue)
    - [Option A: `<datalist>` — browser-native autocomplete](#option-a-datalist--browser-native-autocomplete)
    - [Option B: Plain text input + server-side geocoding](#option-b-plain-text-input--server-side-geocoding)
    - [Option C: Lat/Lng fields](#option-c-latlng-fields)
  - [18. Tailwind Setup and Global Styles](#18-tailwind-setup-and-global-styles)
    - [`main.css` — Unchanged](#maincss--unchanged)
    - [`tailwind.config.js` — Add `peer` variant support for named peers](#tailwindconfigjs--add-peer-variant-support-for-named-peers)
    - [Build Command](#build-command)
  - [19. Backend Changes Required (Server-Side Rendering)](#19-backend-changes-required-server-side-rendering)
    - [19.1 Add a Templating Engine](#191-add-a-templating-engine)
    - [19.2 Add Session-Based Auth (replace JWT localStorage)](#192-add-session-based-auth-replace-jwt-localstorage)
    - [19.3 New Routes](#193-new-routes)
    - [19.4 EJS Template Example (`src/views/search.ejs`)](#194-ejs-template-example-srcviewssearchejs)
  - [20. Migration Execution Plan](#20-migration-execution-plan)
    - [Phase 1 — Visual-only (no functionality change)](#phase-1--visual-only-no-functionality-change)
    - [Phase 2 — Static pages](#phase-2--static-pages)
    - [Phase 3 — Backend server-side rendering](#phase-3--backend-server-side-rendering)
    - [Phase 4 — Map integration (optional)](#phase-4--map-integration-optional)
    - [Phase 5 — Cleanup](#phase-5--cleanup)
  - [21. Final Limitations Summary](#21-final-limitations-summary)

---

## 1. Current JavaScript Dependencies — Full Inventory

Before converting, every JS-driven behavior must be categorized:

### Category A — Replaceable with CSS Only (no functionality lost)
| Feature | Current JS mechanism | CSS replacement |
|---|---|---|
| Auth modal open/close | `showAuthModal = ref(false)` toggled by button click | CSS checkbox hack (`<input type="checkbox">` + label) |
| Auth modal views (options/login/register) | `activeView` ref switching `v-if` | CSS `:target` selector or radio button technique |
| Active nav link highlight | `:class="{ active: currentSection === ... }"` | CSS `:target` on sections or `<a>` with `aria-current` |
| Mobile header collapse | `flex-direction` responsive | Pure CSS `@media` — already handled |
| Button hover effects | CSS `transition` (already CSS) | No change needed |
| Modal overlay dismiss | `@click="showAuthModal = false"` on overlay div | CSS-only: overlay is a `<label>` for the checkbox |
| Step indicator in Register form | `showLocationInput = ref(false)` | CSS radio group + `:checked` sibling combinator |

### Category B — Must move to the backend (form submissions instead of fetch)
| Feature | Current JS mechanism | HTML/Backend replacement |
|---|---|---|
| Login | `fetch POST /api/auth/login` + localStorage tokens | `<form action="/auth/login" method="POST">` → backend sets a session cookie, redirects |
| Register | `fetch POST /api/auth/register` | `<form action="/auth/register" method="POST">` → backend handles, redirects |
| Donor creation (DonorForm) | `fetch POST /api/donors` | `<form action="/donors" method="POST">` |
| Profile update | `fetch PUT /api/auth/profile` | `<form action="/auth/profile" method="POST">` |
| Logout | clears localStorage refs | `<a href="/auth/logout">` → backend destroys session, redirects |

### Category C — Requires a static/fallback replacement (no perfect CSS-only substitute)
| Feature | Why it needs JS | Best static fallback |
|---|---|---|
| Leaflet interactive map | Uses the browser DOM, Canvas API, tile downloads | Static map image (e.g. OpenStreetMap static tile API screenshot, or embedded `<iframe>` pointing to a Google Maps/OpenStreetMap URL) |
| Nominatim location autocomplete | Requires `fetch` to Nominatim API + dynamic dropdown rendering | Replace with a plain `<input type="text">` that the user fills manually, or a `<select>` of common cities |
| Live donor search results | `fetch GET /api/donors?lat=...` + render loop | `<form method="GET" action="/search">` → backend returns a new full HTML page with results |
| Distance calculation (Haversine) | In-browser math | Backend calculates distance server-side using PostGIS, returns pre-computed `distance_km` in the rendered HTML |
| Map auto-center on donors | Reads donor coordinates, calls `map.setView()` | Static map centered on a fixed city, or an `<iframe>` |
| Auth session persistence | JWT in localStorage, read on mount | HTTP-only session cookie — set by backend on login, read on every request |
| Token refresh | `fetch POST /api/auth/refresh` | Session cookie handled server-side (no client involvement) |
| Loading states (spinners during fetch) | `loading = ref(true)` while awaiting | Removed entirely — page reloads handle this naturally |
| `v-for` donor card rendering | Vue template loop | Backend renders `<div class="donor-card">` for each row in SQL result |

---

## 2. CSS-Only Interaction Toolkit

These are the exact CSS patterns used to replace JavaScript interactivity throughout the converted app.

### 2.1 The Checkbox Hack — Modal Toggle

Replaces `showAuthModal = ref(false)`.

```html
<!-- Hidden checkbox controls open/close state -->
<input type="checkbox" id="auth-modal-toggle" class="hidden peer/modal">

<!-- This label IS the Login button -->
<label for="auth-modal-toggle" class="...login button styles...">
  Login
</label>

<!-- Modal — hidden by default, shown when checkbox is checked -->
<div class="hidden peer-checked/modal:block ...modal styles...">
  <!-- modal content -->
</div>

<!-- Overlay — also label, clicking it unchecks the checkbox (closes modal) -->
<label for="auth-modal-toggle"
  class="hidden peer-checked/modal:block fixed inset-0 bg-black/30 z-[999]">
</label>
```

**How it works:** The `<input type="checkbox">` holds the open/close state. The `peer/modal` class names the peer group. `peer-checked/modal:block` means "display block when the named checkbox peer is checked." The overlay `<label>` also targets the same checkbox, so clicking the backdrop unchecks it (closes the modal). No JavaScript.

### 2.2 Radio Button Technique — Multi-View Switching

Replaces `activeView = ref<'options' | 'login' | 'register'>('options')`.

```html
<!-- Three radio buttons — one for each view -->
<input type="radio" name="auth-view" id="view-options" class="hidden peer/options" checked>
<input type="radio" name="auth-view" id="view-login" class="hidden peer/login">
<input type="radio" name="auth-view" id="view-register" class="hidden peer/register">

<!-- Labels are the clickable buttons that switch views -->
<label for="view-login" class="...button styles...">Login</label>
<label for="view-register" class="...button styles...">Register as Donor</label>

<!-- Each view panel — hidden by default, shown when its radio is checked -->
<div class="hidden peer-checked/options:block">
  <!-- auth options view -->
</div>
<div class="hidden peer-checked/login:block">
  <!-- login form -->
</div>
<div class="hidden peer-checked/register:block">
  <!-- register form -->
</div>
```

**Note:** Tailwind v3.3+ supports arbitrary peer names with the `/name` syntax. This project uses Tailwind v4, which fully supports it.

### 2.3 CSS `:target` — Section Navigation

Replaces `currentSection = ref<string>('home')` for the nav active state.

```html
<nav>
  <a href="#home" class="nav-link target:text-red-600">Home</a>
  <a href="#find-donor" class="nav-link">Find Donor</a>
</nav>

<section id="home">...</section>
<section id="find-donor">...</section>
```

When `#home` is in the URL, `section#home:target` is active. CSS rule:
```css
.nav-link { color: #374151; border-bottom: 2px solid transparent; }
section:target ~ header .nav-link[href="#..."] { color: #dc2626; }
```

**Limitation:** The `:target` selector applies to the element with the matching ID, not to the link pointing to it. Complex nav active states require a structural workaround: place the `<nav>` links AFTER the sections in HTML source order and use the general sibling combinator (`~`). This is doable but requires inverting the visual order with CSS `order` or restructuring the HTML.

### 2.4 Register Form Two-Step — Checkbox Technique

Replaces `showLocationInput = ref(false)` in `Register.vue`.

```html
<input type="checkbox" id="step2-toggle" class="hidden peer/step2">

<!-- Step 1 form fields — shown when checkbox is NOT checked -->
<div class="peer-checked/step2:hidden block">
  <!-- name, email, password, blood group, phone, address fields -->
  
  <!-- This label advances to step 2 -->
  <label for="step2-toggle" class="...button...">
    📍 Add your location
  </label>
</div>

<!-- Step 2 location field — shown when checkbox IS checked -->
<div class="hidden peer-checked/step2:block">
  <label for="step2-toggle" class="...back button...">← Back</label>
  <!-- location text input -->
  <button type="submit">Register as Donor</button>
</div>
```

### 2.5 Hover-Only Interactivity

All hover effects are already CSS — they stay as-is using Tailwind `hover:` variants:
- `hover:bg-red-700` (button darken)
- `hover:-translate-y-0.5 hover:shadow-lg` (lift effect)
- `hover:bg-red-50 hover:border-l-[3px] hover:border-l-red-600` (suggestion item)

---

## 3. File Structure for the Static Version

The Vue SPA (one HTML file at runtime) becomes a set of HTML pages served by the backend:

```
backend/src/
  views/             ← New: HTML templates rendered by Express
    layout.html      ← Base layout (header, footer, nav)
    home.html        ← Main landing page (hero, how-it-works, stats, cta)
    search.html      ← Donor search form + results (server-rendered)
    register.html    ← Donor registration form
    login.html       ← Login form
    profile.html     ← Authenticated user profile
    404.html         ← Not found page

frontend/            ← Becomes pure static assets only
  public/
    css/
      main.css       ← Built Tailwind output (single CSS file)
    leaflet/
      images/        ← Leaflet marker PNGs (kept for potential future use)
  index.html         ← No longer used if backend serves HTML

```

Or, if you want to keep it as a static multi-page site without changing the backend at all, the structure is:

```
frontend/
  index.html          ← Home page (static, no search results)
  search.html         ← Search page with a GET form (results are static placeholder)
  register.html       ← Registration form (submits to backend)
  login.html          ← Login form (submits to backend)
  css/
    main.css          ← Compiled Tailwind CSS
  public/
    leaflet/images/
```

This guide documents the **static multi-page approach** (pure HTML files, no backend templating) because it requires zero backend changes. The backend changes needed for full parity are described separately in [Section 19](#19-backend-changes-required-server-side-rendering).

---

## 4. Page Layout and Header (app.vue)

The entire `app.vue` template becomes `index.html`.

### Full-Bleed Section Fix

The current Vue code uses a CSS hack to break out of the container:
```css
/* Current — hacky, breaks with nested containers */
width: 100vw;
margin-left: calc(-50vw + 50%);
```

In pure HTML, you simply don't nest these sections inside a container. They sit at the top level:

```html
<body class="min-h-screen bg-white font-sans overflow-x-hidden">

  <!-- HEADER — fixed, full width -->
  <header class="fixed top-0 left-0 right-0 z-[1000] bg-white shadow-sm border-b border-gray-200">
    ...
  </header>

  <!-- MAIN — padding-top offsets the fixed header (4rem = 64px) -->
  <main class="pt-16 w-full m-0 p-0">

    <!-- Hero — sits directly in <main>, NOT inside a max-w container -->
    <section class="bg-gradient-to-br from-red-600 to-red-700 text-white py-16 text-center w-full">
      <!-- Inner content IS constrained -->
      <div class="max-w-3xl mx-auto px-8">
        ...
      </div>
    </section>

    <!-- Results section — inside constrained content -->
    <section class="py-16 px-8 bg-white">
      <div class="max-w-7xl mx-auto">...</div>
    </section>

    <!-- Statistics — full bleed again, sits directly in <main> -->
    <section class="py-16 bg-gray-50 w-full">
      <div class="max-w-5xl mx-auto px-8">...</div>
    </section>

    <!-- CTA — full bleed -->
    <section class="py-16 bg-red-600 text-center w-full">
      <div class="max-w-2xl mx-auto px-8">...</div>
    </section>

  </main>

  <footer class="bg-gray-800 text-gray-300 py-8 text-center">
    ...
  </footer>

</body>
```

No `calc(-50vw + 50%)` needed. Clean, semantic, zero tricks.

### Header HTML

```html
<!-- Checkbox for modal state — must come before the header in DOM order for sibling CSS -->
<input type="checkbox" id="auth-modal-toggle" class="hidden peer/modal">

<header class="fixed top-0 left-0 right-0 z-[1000] bg-white shadow border-b border-gray-200">
  <div class="w-full px-8">
    <div class="flex justify-between items-center h-16">

      <!-- Logo -->
      <div class="flex items-center gap-2">
        <span class="text-2xl leading-none">🩸</span>
        <h1 class="text-2xl font-bold text-red-600 m-0">BloodConnect</h1>
      </div>

      <!-- Navigation -->
      <nav class="flex gap-8 items-center">
        <a href="index.html"
           class="text-gray-700 no-underline font-medium py-2 border-b-2 border-transparent
                  hover:text-red-600 hover:border-red-600 transition-all duration-200">
          Home
        </a>
        <a href="search.html"
           class="text-gray-700 no-underline font-medium py-2 border-b-2 border-transparent
                  hover:text-red-600 hover:border-red-600 transition-all duration-200">
          Find Donor
        </a>
        <a href="register.html"
           class="text-gray-700 no-underline font-medium py-2 border-b-2 border-transparent
                  hover:text-red-600 hover:border-red-600 transition-all duration-200">
          Register
        </a>
      </nav>

      <!-- Login Button — this label toggles the modal checkbox -->
      <label for="auth-modal-toggle"
        class="flex items-center gap-2 bg-red-600 text-white border-none px-4 py-2
               rounded-lg font-semibold cursor-pointer transition-all duration-200
               hover:bg-red-700 hover:-translate-y-px relative">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
        </svg>
        Login

        <!-- Auth Modal — positioned absolutely under the button -->
        <!-- Shown via peer-checked: only visible when checkbox is checked -->
        <div class="hidden peer-checked/modal:block absolute top-full right-0 mt-2
                    bg-white rounded-lg shadow-2xl min-w-80 max-w-sm z-[1001]
                    border border-gray-100 text-left font-normal cursor-default">
          <!-- Modal content — see Section 5 -->
        </div>
      </label>

    </div>
  </div>
</header>

<!-- Overlay — clicking it unchecks the modal checkbox (closes modal) -->
<label for="auth-modal-toggle"
  class="hidden peer-checked/modal:block fixed inset-0 bg-black/30 z-[999] cursor-default">
</label>
```

**Important:** The `<label>` wraps the button text AND the modal div. The modal is a child of the label, inheriting `position: relative` from the button. `cursor-default` and `font-normal` reset the label's inherited appearance so the modal looks like a regular panel.

---

## 5. Auth Modal (Login / Register) — CSS-Only Tabs

This replaces the `activeView` ref and the three `v-if` blocks.

```html
<!-- Inside the modal div from Section 4 -->

<!-- Radio buttons control which panel is visible -->
<input type="radio" name="auth-view" id="view-options"  class="hidden peer/options"  checked>
<input type="radio" name="auth-view" id="view-login"    class="hidden peer/login">
<input type="radio" name="auth-view" id="view-register" class="hidden peer/register">

<!-- ── OPTIONS VIEW (default) ── -->
<div class="peer-checked/options:block hidden">
  <div class="px-6 pt-6 pb-0 border-b border-gray-200 mb-4">
    <h3 class="text-xl font-bold text-gray-900 mb-1">Welcome to BloodConnect</h3>
    <p class="text-sm text-gray-600 mb-4">Save lives by donating blood</p>
  </div>
  <div class="px-6 pb-6 flex flex-col gap-3">
    <!-- Register option button — label activates the register radio -->
    <label for="view-register"
      class="flex items-center gap-3 px-4 py-3.5 border-2 border-red-600 rounded-lg
             font-semibold cursor-pointer transition-all duration-200 text-red-600 bg-white
             hover:bg-red-600 hover:text-white">
      <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
      </svg>
      Register as a Donor
    </label>
    <!-- Login option button -->
    <label for="view-login"
      class="flex items-center gap-3 px-4 py-3.5 border-2 border-gray-300 rounded-lg
             font-semibold cursor-pointer transition-all duration-200 text-gray-700
             hover:border-gray-400 hover:bg-gray-50">
      <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
      </svg>
      Login to Your Account
    </label>
  </div>
</div>

<!-- ── LOGIN VIEW ── -->
<div class="peer-checked/login:block hidden">
  <div class="px-6 pt-6 pb-0 border-b border-gray-200 mb-4">
    <h3 class="text-xl font-bold text-gray-900 mb-1">Login to Your Account</h3>
    <p class="text-sm text-gray-600 mb-4">Access your donor profile</p>
  </div>
  <div class="px-6 pb-6">
    <!-- Login form — see Section 12 for full form HTML -->
    <!-- form action="/auth/login" method="POST" -->
  </div>
</div>

<!-- ── REGISTER VIEW ── -->
<div class="peer-checked/register:block hidden">
  <div class="px-6 pt-6 pb-0 border-b border-gray-200 mb-4">
    <h3 class="text-xl font-bold text-gray-900 mb-1">Register as a Donor</h3>
    <p class="text-sm text-gray-600 mb-4">Join our community of life-savers</p>
  </div>
  <div class="px-6 pb-6 max-h-[70vh] overflow-y-auto">
    <!-- Register form — see Section 13 -->
  </div>
</div>
```

**Authenticated User View:** This cannot be done in CSS-only on the client side since you can't query localStorage or a cookie from CSS. The solution is server-side: when the user is logged in, the backend renders the header with the profile card HTML instead of the login button. Explained in [Section 19](#19-backend-changes-required-server-side-rendering).

---

## 6. Hero Section and Search Form

The search form changes from a JS-driven `fetch` call to a regular HTTP GET form. Submitting it will navigate to `search.html?blood_group=O%2B&location=New+York&lat=40.71&lng=-74.00`.

```html
<section class="bg-gradient-to-br from-red-600 to-red-700 text-white py-16 text-center w-full">
  <div class="max-w-3xl mx-auto px-8">

    <h1 class="text-5xl font-extrabold mb-4 leading-tight">
      Save Lives Through Blood Donation
    </h1>
    <p class="text-xl mb-12 opacity-95 leading-relaxed">
      Connect with nearby blood donors instantly during emergencies.
      Fast, reliable, and life-saving.
    </p>

    <!-- Search form — GET submits to search.html with query params -->
    <form action="search.html" method="GET"
          class="bg-white p-8 rounded-2xl shadow-2xl mx-auto max-w-4xl border border-white/10">

      <div class="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-center">

        <!-- Blood Group Dropdown -->
        <div class="relative flex items-center h-[60px]">
          <select name="blood_group"
            class="w-full h-full px-4 pr-12 border-2 border-gray-300 rounded-xl text-base
                   font-normal bg-white text-gray-600 appearance-none cursor-pointer
                   transition-all duration-200 focus:outline-none focus:border-red-600
                   focus:ring-4 focus:ring-red-600/10
                   bg-[url('data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3e%3cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27m6 8 4 4 4-4%27/%3e%3c/svg%3e')]
                   bg-[position:right_0.75rem_center] bg-no-repeat bg-[size:1.5em_1.5em]">
            <option value="" disabled selected>Select Blood Group</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>
        </div>

        <!-- Location Input -->
        <!-- Without JS autocomplete, this is a plain text input -->
        <!-- The user types their city/address manually -->
        <div class="relative flex items-center h-[60px] border-2 border-gray-300
                    rounded-xl bg-white transition-all duration-200
                    focus-within:border-red-600 focus-within:ring-4 focus-within:ring-red-600/10">
          <svg class="absolute left-4 w-5 h-5 text-gray-400 z-10 pointer-events-none"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          <input type="text" name="location"
                 placeholder="Enter your city or address"
                 class="w-full h-full border-none outline-none text-base text-gray-700
                        bg-transparent pl-11 pr-4">
        </div>

        <!-- Search Button -->
        <button type="submit"
          class="flex items-center justify-center gap-2 bg-red-600 text-white border-none
                 px-8 h-[60px] rounded-xl text-base font-semibold cursor-pointer
                 transition-all duration-200 whitespace-nowrap min-w-[160px] shadow-red-200
                 shadow-md hover:bg-red-700 hover:-translate-y-0.5 hover:shadow-red-300
                 hover:shadow-lg">
          <svg class="w-[1.125rem] h-[1.125rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          Find Blood Now
        </button>

      </div>
    </form>

  </div>
</section>
```

**Location limitation:** Without JavaScript, there is no Nominatim autocomplete. The user types a location string. The backend must geocode this text string server-side (using the Nominatim API via a backend HTTP call) to convert it to lat/lng for the PostGIS query. Alternatively, include `<datalist>` with a preset list of major cities as a partial substitute.

---

## 7. Nearby Donors Section

On the main `index.html`, this section is hidden by default (there are no results yet). On `search.html`, the backend renders this section with actual donor cards using PostGIS results.

```html
<!-- On index.html: this section is not rendered at all (no v-if needed — just don't include it) -->

<!-- On search.html: backend renders this section filled with real donor data -->
<section class="py-16 px-8 bg-white">
  <div class="max-w-7xl mx-auto">

    <div class="text-center mb-12">
      <h2 class="text-4xl font-bold text-red-600 mb-4">Nearby Donors</h2>
      <p class="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
        Real-time location of available blood donors in your area
      </p>
    </div>

    <!-- Map — static fallback: see Section 16 -->
    <div class="bg-white rounded-2xl overflow-hidden shadow-md mb-8 h-96">
      <!-- See Section 16 for map HTML -->
    </div>

    <!-- Donor cards grid — server-rendered in search.html -->
    <div class="bg-white rounded-2xl shadow-md">
      <!-- See Section 14 for donor card HTML -->
    </div>

  </div>
</section>
```

---

## 8. How It Works Section

Purely static — no JS currently. Direct Tailwind conversion:

```html
<section class="py-16 px-8 bg-white">
  <div class="max-w-7xl mx-auto">

    <div class="text-center mb-12">
      <h2 class="text-4xl font-bold text-red-600 mb-4">How BloodConnect Works</h2>
      <p class="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
        Simple steps to save a life
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">

      <!-- Step 1 -->
      <div class="text-center p-8">
        <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 text-red-600
                    flex items-center justify-center">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
        <h3 class="text-xl font-bold text-gray-900 mb-4">1. Search for Donors</h3>
        <p class="text-gray-600 leading-relaxed">
          Enter the required blood group and your location to find nearby donors instantly.
        </p>
      </div>

      <!-- Step 2 -->
      <div class="text-center p-8">
        <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 text-red-600
                    flex items-center justify-center">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
          </svg>
        </div>
        <h3 class="text-xl font-bold text-gray-900 mb-4">2. View on Map</h3>
        <p class="text-gray-600 leading-relaxed">
          See available donors on an interactive map with distance and availability status.
        </p>
      </div>

      <!-- Step 3 -->
      <div class="text-center p-8">
        <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 text-red-600
                    flex items-center justify-center">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
          </svg>
        </div>
        <h3 class="text-xl font-bold text-gray-900 mb-4">3. Contact & Save</h3>
        <p class="text-gray-600 leading-relaxed">
          Connect with donors directly through call or message to arrange donation.
        </p>
      </div>

    </div>
  </div>
</section>
```

---

## 9. Statistics Section

Purely static content. Full-bleed using the correct structural approach (section at top level, not nested in a container):

```html
<section class="py-16 bg-gray-50 w-full">
  <div class="max-w-5xl mx-auto px-8">
    <div class="flex justify-center items-stretch gap-8 flex-wrap md:flex-nowrap">

      <!-- Stat 1 -->
      <div class="text-center px-10 py-8 flex-1 min-w-[200px] bg-white rounded-2xl
                  shadow-[0_2px_8px_rgba(0,0,0,0.07)]">
        <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 text-red-600
                    flex items-center justify-center">
          <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-1.5-6h-6v3h8v9h-3z"/>
          </svg>
        </div>
        <div class="text-5xl font-extrabold text-gray-900 mb-2">1,247</div>
        <div class="text-base text-gray-600 font-medium">Registered Donors</div>
      </div>

      <!-- Stat 2 -->
      <div class="text-center px-10 py-8 flex-1 min-w-[200px] bg-white rounded-2xl
                  shadow-[0_2px_8px_rgba(0,0,0,0.07)]">
        <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 text-red-600
                    flex items-center justify-center">
          <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          </svg>
        </div>
        <div class="text-5xl font-extrabold text-gray-900 mb-2">3,421</div>
        <div class="text-base text-gray-600 font-medium">Lives Saved</div>
      </div>

      <!-- Stat 3 -->
      <div class="text-center px-10 py-8 flex-1 min-w-[200px] bg-white rounded-2xl
                  shadow-[0_2px_8px_rgba(0,0,0,0.07)]">
        <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 text-red-600
                    flex items-center justify-center">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div class="text-5xl font-extrabold text-gray-900 mb-2">&lt; 15 min</div>
        <div class="text-base text-gray-600 font-medium">Average Response Time</div>
      </div>

    </div>
  </div>
</section>
```

---

## 10. CTA Section

```html
<section class="py-16 bg-red-600 text-center w-full">
  <div class="max-w-2xl mx-auto px-8">

    <h2 class="text-4xl font-bold text-white mb-4">Ready to Make a Difference?</h2>
    <p class="text-lg text-white mb-8 leading-relaxed opacity-95">
      Join our community of life-savers today and help those in need during emergencies.
    </p>

    <div class="flex flex-col md:flex-row justify-center gap-4 max-w-md mx-auto">
      <a href="register.html"
        class="px-8 py-4 rounded-lg text-lg font-semibold cursor-pointer
               transition-all duration-200 border-2 no-underline
               bg-white border-white text-red-600
               hover:bg-gray-100 hover:border-gray-100 hover:-translate-y-0.5">
        Register as Donor
      </a>
      <a href="search.html"
        class="px-8 py-4 rounded-lg text-lg font-semibold cursor-pointer
               transition-all duration-200 border-2 no-underline
               bg-transparent border-white text-white
               hover:bg-white hover:text-red-600 hover:-translate-y-0.5">
        Find Blood Now
      </a>
    </div>

  </div>
</section>
```

---

## 11. Footer

```html
<footer class="bg-gray-800 text-gray-300 py-8 text-center">
  <div class="max-w-7xl mx-auto">
    <p class="text-sm">© 2026 BloodConnect. All rights reserved. Saving lives together.</p>
  </div>
</footer>
```

---

## 12. Login Form (Login.vue)

Becomes a `<form>` that POSTs to the backend. The backend validates credentials, sets a session cookie, and redirects to the profile page (or back with an error message in the HTML).

```html
<!-- login.html — standalone page -->
<form action="/api/auth/login" method="POST"
      class="w-full flex flex-col gap-4">

  <!-- Error message — rendered by backend on failed login -->
  <!-- Example: backend adds ?error=1 to redirect URL and page shows this conditionally -->
  <!-- In pure static HTML, you cannot show server errors. Backend must render it. -->

  <div class="flex flex-col gap-2">
    <label for="email" class="text-sm font-medium text-gray-700">Email</label>
    <input id="email" name="email" type="email" required
           placeholder="your.email@example.com"
           class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base
                  transition-all duration-200 outline-none
                  focus:border-red-600 focus:ring-4 focus:ring-red-600/10">
  </div>

  <div class="flex flex-col gap-2">
    <label for="password" class="text-sm font-medium text-gray-700">Password</label>
    <input id="password" name="password" type="password" required
           placeholder="Enter your password"
           class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base
                  transition-all duration-200 outline-none
                  focus:border-red-600 focus:ring-4 focus:ring-red-600/10">
  </div>

  <button type="submit"
    class="w-full py-3 bg-red-600 text-white border-none rounded-lg font-semibold
           cursor-pointer transition-all duration-200
           hover:bg-red-700 hover:-translate-y-px hover:shadow-md">
    Login
  </button>

  <div class="text-center mt-2">
    <a href="register.html"
       class="text-sm text-red-600 no-underline hover:underline">
      Don't have an account? Register as a donor
    </a>
  </div>

</form>
```

**Backend must change:** `POST /api/auth/login` currently returns JSON `{ user, token }`. For HTML form submission, it must instead set an HTTP-only session cookie and respond with a `302 Location: /profile.html` redirect. See [Section 19](#19-backend-changes-required-server-side-rendering).

---

## 13. Register Form (Register.vue)

The two-step form uses the checkbox technique from [Section 2.4](#24-register-form-two-step--checkbox-technique). The location step becomes a plain text input (no Nominatim autocomplete).

```html
<!-- register.html — standalone page (or inside modal) -->

<!-- Checkbox controls which step is shown -->
<input type="checkbox" id="reg-step2" class="hidden peer/step2">

<form action="/api/auth/register" method="POST" class="flex flex-col gap-4">

  <!-- ── STEP 1 ── shown when checkbox is NOT checked -->
  <div class="peer-checked/step2:hidden block flex flex-col gap-4">

    <input name="name" type="text" required placeholder="Full Name"
           class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base outline-none
                  focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all">

    <input name="email" type="email" required placeholder="Email Address"
           class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base outline-none
                  focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all">

    <input name="password" type="password" required minlength="6"
           placeholder="Password (min 6 characters)"
           class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base outline-none
                  focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all">

    <select name="blood_group" required
            class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base text-gray-600
                   appearance-none outline-none focus:border-red-600 transition-all
                   bg-[url('...')] bg-[position:right_0.75rem_center] bg-no-repeat bg-[size:1.5em]">
      <option value="" disabled selected>Select Blood Group</option>
      <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
      <option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
    </select>

    <input name="phone" type="tel" required placeholder="Phone Number"
           class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base outline-none
                  focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all">

    <textarea name="address" required rows="3" placeholder="Full Address"
              class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base outline-none
                     focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all
                     resize-none"></textarea>

    <!-- This label advances to step 2 — it is NOT a submit button -->
    <label for="reg-step2" type="button"
           class="flex items-center justify-center gap-2 w-full py-3 border-2
                  border-red-600 text-red-600 rounded-lg font-semibold cursor-pointer
                  transition-all hover:bg-red-600 hover:text-white">
      📍 Add Your Location
    </label>

    <div class="text-center">
      <a href="login.html" class="text-sm text-red-600 no-underline hover:underline">
        Already have an account? Login
      </a>
    </div>
  </div>

  <!-- ── STEP 2 ── shown when checkbox IS checked -->
  <div class="hidden peer-checked/step2:flex flex-col gap-4">

    <label for="reg-step2"
           class="text-sm text-gray-600 cursor-pointer hover:text-red-600 transition-colors">
      ← Back to details
    </label>

    <p class="text-sm text-gray-600">
      Enter your city or address so donors can find you.
    </p>

    <!-- Plain text location input — backend geocodes this -->
    <input name="location_text" type="text" required
           placeholder="e.g. New York, NY or 123 Main St, Brooklyn"
           class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base outline-none
                  focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all">

    <!-- OR: provide lat/lng explicitly if you want to avoid backend geocoding -->
    <!--
    <input name="lat" type="number" step="any" placeholder="Latitude" required>
    <input name="lng" type="number" step="any" placeholder="Longitude" required>
    -->

    <button type="submit"
      class="w-full py-3 bg-red-600 text-white border-none rounded-lg font-semibold
             cursor-pointer transition-all hover:bg-red-700 hover:-translate-y-px">
      Register as Donor
    </button>

  </div>

</form>
```

**Backend must change:** The register endpoint needs to accept a `location_text` string, geocode it server-side via a Nominatim API call, extract `lat`/`lng`, then proceed with the INSERT. Or accept direct `lat`/`lng` fields and have the user provide them manually.

---

## 14. Donor Cards and Grid (SearchDonors.vue)

On the static version, `search.html` is served by the backend with this structure pre-filled with real data. In a purely static version (no backend rendering), you display a static placeholder grid.

### Results Grid Template

```html
<div class="p-8">

  <!-- Results header -->
  <div class="mb-6">
    <h3 class="text-xl font-bold text-gray-900">
      Found 12 Donors
      <!-- Backend renders the actual count -->
    </h3>
    <p class="text-sm text-gray-500 mt-1">Within 10km radius</p>
  </div>

  <!-- Donor cards grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

    <!-- One card — backend repeats this block for each donor row -->
    <div class="bg-white border border-gray-200 rounded-xl p-5
                shadow-sm hover:shadow-md transition-shadow duration-200">

      <!-- Donor header: name + blood group badge -->
      <div class="flex justify-between items-start mb-3">
        <h4 class="font-bold text-gray-900 text-base">Jane Doe</h4>
        <span class="bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold shrink-0 ml-2">
          O+
        </span>
      </div>

      <!-- Email -->
      <p class="text-sm text-gray-500 mb-1 truncate">jane@example.com</p>

      <!-- Address -->
      <p class="text-sm text-gray-600 mb-4 leading-relaxed">123 Main St, Brooklyn, NY</p>

      <!-- Footer: distance + call button -->
      <div class="flex justify-between items-center pt-3 border-t border-gray-100">
        <span class="text-sm text-gray-500">📍 2.4km away</span>
        <a href="tel:+1234567890"
           class="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold
                  no-underline transition-all hover:bg-red-700 hover:-translate-y-px">
          📞 Call
        </a>
      </div>

    </div>
    <!-- End of one card — backend repeats above for each donor -->

  </div>

  <!-- Empty state — backend renders this instead of the grid when no results -->
  <!--
  <div class="text-center py-16">
    <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" .../>
    <h3 class="text-xl font-bold text-gray-900 mb-3">No donors found</h3>
    <p class="text-gray-600 max-w-md mx-auto">
      No blood donors found in the specified area. Try expanding the search radius
      or searching in a different location.
    </p>
  </div>
  -->

  <!-- Welcome state (no search yet) — shown on initial load of search.html -->
  <!--
  <div class="text-center py-16">
    <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" .../>
    <h3 class="text-xl font-bold text-gray-900 mb-3">Search for Donors</h3>
    <p class="text-gray-600 max-w-md mx-auto">
      Enter a blood group and location above to find nearby donors.
    </p>
  </div>
  -->

</div>
```

---

## 15. DonorForm Component (DonorForm.vue)

Becomes a standard HTML form on its own page `donor-form.html`. Same structure as Register in Section 13 but POSTs to `/api/donors` (the unauthenticated endpoint). No step 2 location picker — just lat/lng text inputs.

---

## 16. Map Placeholder (LeafletMap.vue → MapView.vue)

Leaflet is a JavaScript library. It cannot run without JS. There are three pure-HTML alternatives, each with different tradeoffs:

### Option A: OpenStreetMap Static Tile (iframe)
Embed a static OpenStreetMap view with no JavaScript required:

```html
<div class="bg-white rounded-2xl overflow-hidden shadow-md mb-8 h-96 w-full relative">
  <iframe
    src="https://www.openstreetmap.org/export/embed.html?bbox=-74.2591,40.4774,-73.7004,40.9176&layer=mapnik"
    class="w-full h-full border-none"
    title="Donor map"
    loading="lazy">
  </iframe>
  <div class="absolute bottom-2 right-2 bg-white/90 px-2 py-1 rounded text-xs text-gray-500">
    <a href="https://www.openstreetmap.org" target="_blank" class="text-blue-600">
      © OpenStreetMap contributors
    </a>
  </div>
</div>
```

This shows a real zoomable/pannable map but **cannot show donor markers**. The user can still see the geography and mentally locate donors based on the address text in the donor cards.

### Option B: Static Map Image (no interactivity)
Use the OpenStreetMap tile server to generate a static map image URL:

```html
<div class="bg-gray-100 rounded-2xl overflow-hidden shadow-md mb-8 h-96 w-full relative">
  <img
    src="https://staticmap.openstreetmap.de/staticmap.php?center=40.7128,-74.0060&zoom=12&size=900x400"
    alt="Map of donor search area"
    class="w-full h-full object-cover"
    loading="lazy">
  <div class="absolute inset-0 flex items-end justify-start p-4">
    <span class="bg-white/90 px-3 py-1 rounded-full text-sm text-gray-600">
      Interactive map requires JavaScript
    </span>
  </div>
</div>
```

### Option C: Graceful placeholder
A styled placeholder that honestly communicates the limitation:

```html
<div class="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl
            mb-8 h-96 w-full flex flex-col items-center justify-center text-center p-8">
  <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
  </svg>
  <p class="text-gray-500 font-medium mb-1">Interactive map</p>
  <p class="text-sm text-gray-400">
    Donor locations shown in the cards below with distances
  </p>
</div>
```

**Recommendation:** Option A (iframe) gives the closest visual result to the current Leaflet map without any JavaScript.

---

## 17. Location Search (LocationSearch.vue)

The Nominatim autocomplete dropdown requires JavaScript. Replacements in order of quality:

### Option A: `<datalist>` — browser-native autocomplete
```html
<input type="text" name="location" list="cities-list"
       placeholder="Enter your city or address"
       class="...same styles as Section 6...">

<datalist id="cities-list">
  <option value="New York, NY">
  <option value="Los Angeles, CA">
  <option value="Chicago, IL">
  <option value="Houston, TX">
  <option value="Phoenix, AZ">
  <option value="Philadelphia, PA">
  <option value="San Antonio, TX">
  <option value="San Diego, CA">
  <option value="Dallas, TX">
  <option value="San Jose, CA">
  <!-- Add more as needed -->
</datalist>
```

Browser natively shows a dropdown of matching options as the user types. No styling control over the dropdown (browser-rendered). No API call. Covers common city names only.

### Option B: Plain text input + server-side geocoding

Just the `<input type="text" name="location">` from Section 6. The backend receives the text, calls Nominatim server-side to get coordinates, and uses them for the PostGIS query. Zero client-side JS, handles any location the user types. Covered in Section 19.

### Option C: Lat/Lng fields

Expose the GPS coordinates directly:

```html
<input type="text" name="location" placeholder="City or address" class="...">
<div class="flex gap-2 mt-2">
  <input type="number" name="lat" step="any" placeholder="Latitude (optional)" class="...">
  <input type="number" name="lng" step="any" placeholder="Longitude (optional)" class="...">
</div>
<p class="text-xs text-gray-400 mt-1">
  Leave lat/lng blank to use your city name
</p>
```

---

## 18. Tailwind Setup and Global Styles

The setup stays identical to the current Vue project. `main.css` is unchanged except the component layer classes are now applied directly in HTML (they're still usable in HTML with `class="btn-primary"`), and the CSS custom properties are still available.

### `main.css` — Unchanged

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --primary-red: #dc2626;
  --primary-red-dark: #b91c1c;
  --primary-red-light: #f87171;
  --gray-50: #f9fafb;
  /* ... rest of gray scale unchanged ... */
}

@layer components {
  .blood-badge { @apply bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold; }
  .btn-primary { @apply bg-red-600 text-white px-4 py-2 rounded-lg font-semibold ... ; }
  .btn-secondary { @apply bg-white border-2 border-red-600 text-red-600 ... ; }
  .form-input { @apply w-full px-4 py-3 border-2 border-gray-300 rounded-lg ... ; }
  .card { @apply bg-white rounded-xl shadow-md; }
}
```

### `tailwind.config.js` — Add `peer` variant support for named peers

Tailwind v4 supports arbitrary peer names natively. If using v3, add this to `tailwind.config.js`:

```js
export default {
  content: ["./**/*.html"],   // scan HTML files instead of .vue
  theme: {
    extend: {
      colors: {
        'blood-red': { /* existing palette */ }
      }
    }
  },
  plugins: []
}
```

### Build Command

```bash
# In frontend/
npx tailwindcss -i ./src/styles/main.css -o ./public/css/output.css --watch
```

Each HTML file links to the built CSS:

```html
<link rel="stylesheet" href="/css/output.css">
```

---

## 19. Backend Changes Required (Server-Side Rendering)

To fully replicate the dynamic functionality (donor search results, user auth session, profile page), the Express backend must add server-side HTML rendering capabilities.

### 19.1 Add a Templating Engine

Install a templating engine (EJS is the simplest for Express):

```bash
cd backend && npm install ejs @types/ejs
```

In `server.ts`:
```ts
import { join } from 'node:path'
app.set('view engine', 'ejs')
app.set('views', join(process.cwd(), 'src/views'))
app.use(express.static(join(process.cwd(), '../frontend')))  // serve CSS + static assets
```

### 19.2 Add Session-Based Auth (replace JWT localStorage)

Install session middleware:
```bash
npm install express-session connect-pg-simple
```

Sessions stored in PostgreSQL (no new table needed with `connect-pg-simple`). On login, the user ID goes into `req.session.userId`. On every request, middleware re-fetches the user from DB and attaches it to `req.user`.

This replaces the entire `useAuth.ts` composable. The browser holds only a session cookie (HTTP-only, secure in production) — no tokens, no localStorage.

### 19.3 New Routes

```ts
// GET /search — renders search page with results
app.get('/search', async (req, res) => {
  const { location, blood_group } = req.query

  // 1. Geocode location text → lat, lng via Nominatim
  let lat, lng
  if (req.query.lat && req.query.lng) {
    lat = Number(req.query.lat); lng = Number(req.query.lng)
  } else if (location) {
    const nominatim = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'BloodConnect/1.0' } }
    )
    const results = await nominatim.json()
    if (results.length > 0) { lat = results[0].lat; lng = results[0].lon }
  }

  // 2. PostGIS query (only if we have coords)
  let donors = []
  if (lat && lng) {
    const result = await pool.query(`
      SELECT *, ST_Distance(location, ST_SetSRID(ST_MakePoint($2,$1),4326)::geography)/1000 AS distance_km
      FROM donors WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint($2,$1),4326)::geography, $3 * 1000)
      ${blood_group ? 'AND blood_group = $4' : ''}
      ORDER BY distance_km LIMIT 100
    `, blood_group ? [lat, lng, 10, blood_group] : [lat, lng, 10])
    donors = result.rows
  }

  // 3. Render the HTML page with donors injected
  res.render('search', { donors, query: req.query, user: req.session.user || null })
})

// POST /auth/login — HTML form submission
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body
  // ... bcrypt verify ... same as before
  req.session.userId = user.id
  req.session.user = user
  res.redirect('/profile')  // or back to home
})

// GET /auth/logout
app.get('/auth/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'))
})
```

### 19.4 EJS Template Example (`src/views/search.ejs`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Find Donors — BloodConnect</title>
  <link rel="stylesheet" href="/css/output.css">
</head>
<body class="min-h-screen bg-white font-sans overflow-x-hidden">
  <%- include('partials/header', { user }) %>

  <!-- Search form (pre-fills with query values) -->
  <section class="bg-gradient-to-br from-red-600 to-red-700 ...">
    <form action="/search" method="GET" ...>
      <select name="blood_group">
        <option value="">All Blood Groups</option>
        <% ['A+','A-','B+','B-','AB+','AB-','O+','O-'].forEach(bg => { %>
          <option value="<%= bg %>" <%= query.blood_group === bg ? 'selected' : '' %>>
            <%= bg %>
          </option>
        <% }) %>
      </select>
      <input type="text" name="location" value="<%= query.location || '' %>" ...>
      <button type="submit">Find Blood Now</button>
    </form>
  </section>

  <!-- Results -->
  <% if (donors.length > 0) { %>
    <section ...>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <% donors.forEach(donor => { %>
          <div class="donor-card ...">
            <div class="flex justify-between items-start mb-3">
              <h4 class="font-bold text-gray-900"><%= donor.name %></h4>
              <span class="blood-badge"><%= donor.blood_group %></span>
            </div>
            <p class="text-sm text-gray-500"><%= donor.email %></p>
            <p class="text-sm text-gray-600 mb-4"><%= donor.address %></p>
            <div class="flex justify-between items-center pt-3 border-t border-gray-100">
              <span class="text-sm text-gray-500">
                📍 <%= donor.distance_km.toFixed(1) %>km away
              </span>
              <a href="tel:<%= donor.phone %>" class="call-button ...">📞 Call</a>
            </div>
          </div>
        <% }) %>
      </div>
    </section>
  <% } else if (query.location) { %>
    <!-- Empty state -->
  <% } else { %>
    <!-- Welcome state -->
  <% } %>

  <%- include('partials/footer') %>
</body>
</html>
```

---

## 20. Migration Execution Plan

Follow this order to minimize breakage at each step:

### Phase 1 — Visual-only (no functionality change)
1. Create `index.html` with the full page layout using Tailwind classes matching the current design exactly.
2. Verify all sections render identically: header, hero, how-it-works, statistics, CTA, footer.
3. Add the checkbox + radio CSS-only modal with all three views (options/login/register).
4. Add the search form GET form targeting `search.html`.
5. Compile Tailwind CSS with `npx tailwindcss -i main.css -o output.css`.

### Phase 2 — Static pages
6. Create `login.html` with the login form.
7. Create `register.html` with the two-step register form (checkbox technique).
8. Create `search.html` with the search form + a static placeholder "no results yet" state.
9. Create `register.html` donor-only variation.

### Phase 3 — Backend server-side rendering
10. Install EJS in the backend.
11. Add session-based auth middleware (replace JWT).
12. Add `GET /search` route (geocode + PostGIS query → render `search.ejs`).
13. Change `POST /api/auth/login` to set session cookie + redirect.
14. Change `POST /api/auth/register` to accept `location_text`, geocode it, set session + redirect.
15. Add `GET /auth/logout` route.
16. Add `GET /profile` route → render `profile.ejs` with user data from session.

### Phase 4 — Map integration (optional)
17. Replace the `h-96` map placeholder with an OpenStreetMap `<iframe>`.
18. If you want donor markers without JavaScript: consider a backend solution like generating a static map URL with markers using an API such as `staticmap.openstreetmap.de`.

### Phase 5 — Cleanup
19. Remove `frontend/main.ts`, `app.vue`, all Vue components, all composables.
20. Remove Vite, Vue, and all npm packages from `frontend/package.json`.
21. The only remaining frontend tool is the Tailwind CSS build process.

---

## 21. Final Limitations Summary

| Feature | Current Vue behavior | Static HTML + CSS behavior |
|---|---|---|
| Auth modal open/close | Instant, JS-driven | Instant, CSS checkbox (identical feel) |
| Login/Register view switching | Instant, JS-driven | Instant, CSS radio buttons (identical feel) |
| Register two-step flow | JS ref toggle | CSS checkbox (identical feel) |
| Search results | Dynamic, no page reload | Full page reload to `search.html` |
| Location autocomplete | Nominatim dropdown as you type | Plain text input or `<datalist>` cities |
| Interactive map with donor markers | Leaflet, fully interactive | OpenStreetMap iframe (no markers) or static image |
| Auth session | JWT in localStorage | HTTP-only session cookie (more secure) |
| Distance shown per donor card | Haversine in browser | PostGIS `ST_Distance` on server (identical result) |
| Loading spinners | `v-if="loading"` during fetch | None — page loads show browser progress bar |
| Inline error messages | `v-if="error"` in form | Backend renders error in HTML on redirect |
| Profile page | Same-page panel in modal | Dedicated `/profile.html` or `/profile` route |
| Token expiry / refresh | 15-min JWT | Session cookies — configurable server-side, no client refresh needed |

The **visual design** — every color, shadow, rounded corner, gradient, typography size, spacing, responsive layout, hover effect, and animation — is **100% achievable** in pure HTML + Tailwind CSS. The only losses are in dynamic UX micro-interactions that inherently require JavaScript: the autocomplete dropdown, the Leaflet map markers, and the no-page-reload search experience.
