# 🩸 BloodConnect

A web application that connects blood donors with those in need during emergencies. Built with **Node.js**, **Express**, and **PostgreSQL**.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [Troubleshooting](#troubleshooting)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript (Vanilla) |
| Backend | Node.js, Express |
| Database | PostgreSQL  |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Map | Leaflet.js + OpenStreetMap |

---

## Project Structure

```
bloodconnect/
├── public/                  # All frontend files
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── find-donor.html
│   ├── profile.html
│   ├── styles.css
│   └── main.js
├── server/
│   ├── index.js             # Express entry point
│   ├── db.js                # PostgreSQL connection pool
│   └── routes/
│       ├── auth.js          # /api/auth/* routes
│       └── donors.js        # /api/donors routes
├── test-db.js               # Database connection test script
├── .env                     # Environment variables (never commit this)
├── .gitignore
└── package.json
```

---

## Prerequisites

You need the following installed before starting:

| Tool | Minimum Version | Download |
|---|---|---|
| Node.js | v18+ | https://nodejs.org |
| npm | v8+ | Comes with Node.js |
| PostgreSQL | v14+ | https://postgresql.org |

### Verify your installations

```bash
node --version
npm --version
psql --version
```

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/naziha50/BloodConnect
cd bloodconnect
```

### 2. Install dependencies

```bash
npm install
```

---

## Database Setup

### Step 1 — Install & Start PostgreSQL

---

####  Windows

1. Download the installer from https://postgresql.org/download/windows
2. Run the installer — keep all defaults
3. Set a password for the `postgres` user when prompted — **remember this password**
4. Make sure **pgAdmin 4** is checked during install
5. PostgreSQL starts automatically as a Windows service after install

To start/stop manually:
```
Win + R → services.msc → find "postgresql-x64-16" → Start / Stop
```

---

####  macOS

```bash
# Install via Homebrew (recommended)
brew install postgresql@16

# Start the service
brew services start postgresql@16

# Open psql (use your Mac username, not "postgres")
psql postgres
```

> **Note:** On macOS with Homebrew, PostgreSQL creates a role using your **Mac username** — not `postgres`. See the note in Step 2 below.

---

#### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start the service
sudo systemctl start postgresql
sudo systemctl enable postgresql  # auto-start on boot

# Open psql
sudo -u postgres psql
```

---

### Step 2 — Create the Database User & Password

Once you're inside the `psql` prompt:

**Windows & Linux** — a `postgres` role already exists:
```sql
ALTER USER postgres WITH PASSWORD 'bloodconnect123';
```

**macOS (Homebrew)** — the `postgres` role doesn't exist by default. Create it:
```sql
CREATE USER postgres WITH SUPERUSER PASSWORD 'bloodconnect123';
```

> If you're unsure what roles exist, run `\du` inside psql to list them.

---

### Step 3 — Create the Database & Table

Run the following SQL commands inside psql (all operating systems):

```sql
-- Create the database
CREATE DATABASE bloodconnect;

-- Switch to it
\c bloodconnect

-- Create the users table
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  phone         VARCHAR(20),
  password      TEXT NOT NULL,
  blood_group   VARCHAR(5),
  address       TEXT,
  latitude      NUMERIC(10, 7),
  longitude     NUMERIC(10, 7),
  is_available  BOOLEAN DEFAULT true,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Verify the table was created
\dt

-- Check the columns
\d users
```

You should see the `users` table listed with all 10 columns.

---

### Step 4 — Verify the Database Connection

Run the test script from your project root:

```bash
node test-db.js
```

**Expected output:**
```
✅ Connected! PostgreSQL time: 2026-04-21T10:00:00.000Z
```

Do not move on until this passes. If it fails, see the [Troubleshooting](#troubleshooting) section.

---

## Environment Variables

Create a `.env` file in the **root** of the project (same level as `package.json`):

```env
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=bloodconnect123
DB_NAME=bloodconnect
DB_PORT=5432
JWT_SECRET=bloodconnect_super_secret_jwt_key_2026
```

> **Never commit your `.env` file.** Make sure `.env` is listed in your `.gitignore`.

### `.gitignore` (minimum)
```
node_modules/
.env
```

---

## Running the App

### Development (with auto-restart on file changes)

```bash
npm run dev
```

### Production

```bash
npm start
```

You should see:
```
BloodConnect running on http://localhost:3000
```

Open your browser and go to:
```
http://localhost:3000
```

---

## API Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/api/auth/register` | Register a new donor | No |
| POST | `/api/auth/login` | Login and receive JWT | No |
| GET | `/api/auth/me` | Get current user profile | Yes |
| GET | `/api/donors` | Search/filter donors | No |

### Example — Register a new user

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "555-9999",
    "password": "password123",
    "blood_group": "A+",
    "address": "456 Oak Ave"
  }'
```

### Example — Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "jane@example.com", "password": "password123"}'
```

### Example — Search donors

```bash
curl "http://localhost:3000/api/donors?blood_group=A%2B&availability=available"
```

---

## Viewing the Database

At any time you can inspect what's stored:

```bash
# Connect to the database
psql -U postgres -d bloodconnect      # Windows / Linux
psql bloodconnect                     # macOS (Homebrew)

# List all users
SELECT id, name, email, blood_group, is_available, created_at FROM users;

# Count total donors
SELECT COUNT(*) FROM users;

# Exit
\q
```

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `Cannot find module 'dotenv'` | Dependencies not installed | Run `npm install` |
| `password authentication failed` | Wrong password in `.env` | Double-check `DB_PASSWORD` |
| `database "bloodconnect" does not exist` | DB not created yet | Run the SQL in Step 3 |
| `ECONNREFUSED 127.0.0.1:5432` | PostgreSQL not running | Start the service (see Step 1) |
| `role "postgres" does not exist` | macOS Homebrew setup | Run `CREATE USER postgres WITH SUPERUSER PASSWORD '...'` in psql |
| `Cannot GET /register.html` | HTML files not in `public/` folder | Move all HTML/CSS/JS into `public/` |
| `PathError: Missing parameter name` | Express 5 wildcard syntax | Use `'/{*path}'` instead of `'*'` in the catch-all route |
| `nodemon: command not found` | nodemon not installed globally | Use `npx nodemon server/index.js` instead |
| Page loads but login fails silently | API not responding | Open DevTools → Network tab → check the response body |

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon (auto-restarts on changes) |
| `npm start` | Start normally (production) |
| `node test-db.js` | Test the database connection |

---
