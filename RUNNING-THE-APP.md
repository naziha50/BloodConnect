# BloodConnect - Running & Testing Guide

## Quick Start (5 minutes)

### Option 1: Run Current Vue Frontend (Fastest)

```bash
# Terminal 1 - Start Backend
cd backend
npm install
npm run dev

# Terminal 2 - Start Frontend
cd frontend
npm install
npm run dev
```

Then visit: **http://localhost:5173**

### Option 2: Run New Refactored HTML Frontend (Requires Backend Update)

```bash
# Follow BACKEND-IMPLEMENTATION.md first to add session support
# Then serve the new HTML files from the backend
```

---

## Full Setup Guide

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Git

### Step 1: Database Setup

#### Check if PostgreSQL is running
```bash
# macOS (if using Homebrew)
brew services start postgresql

# Or start manually
postgres -D /usr/local/var/postgres

# Verify connection
psql --version
```

#### Create Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE bloodfinder;

# Create user (if needed)
CREATE USER bloodfinder WITH PASSWORD 'bloodPassword';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE bloodfinder TO bloodfinder;

# Exit
\q
```

#### Run Schema
```bash
# Navigate to backend
cd backend

# Run SQL schema
psql -U bloodfinder -d bloodfinder -f src/db/schema.sql

# Verify
psql -U bloodfinder -d bloodfinder -c "SELECT * FROM donors;"
```

---

### Step 2: Backend Setup & Run

```bash
cd backend

# Install dependencies
npm install

# Check .env file
cat .env

# Ensure DATABASE_URL is correct:
# DATABASE_URL=postgres://bloodfinder:bloodPassword@localhost:5432/bloodfinder

# Run migrations (if any)
npm run build

# Start development server
npm run dev
```

**Expected Output:**
```
🩸 BloodConnect API server running on port 4000
```

**Test Backend:**
```bash
# Open new terminal
curl http://localhost:4000/health

# Should return:
# {"ok":true,"timestamp":"2026-04-20T...","uptime":...}
```

---

### Step 3: Frontend Setup & Run

**For Current Vue Frontend:**
```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

**Expected Output:**
```
VITE v... ready in 123 ms

➜  Local:   http://localhost:5173/
➜  Press q to quit
```

**Visit:** http://localhost:5173

---

## Testing Flows

### Flow 1: Register as Donor (Complete Test)

1. **Open App**: http://localhost:5173
2. **Click**: "Register" in navigation
3. **Fill Form**:
   - Name: `John Doe`
   - Email: `john@example.com`
   - Password: `password123`
   - Blood Group: `A+`
   - Phone: `+1 555-0123`
   - Address: `123 Main St, City`
4. **Add Location**: Click "📍 Add your location" button
5. **Allow Permission**: When browser asks for geolocation
6. **Submit**: Click "Register as Donor"
7. **Check Results**: 
   - ✅ Should redirect to profile
   - ✅ Profile shows your info
   - ✅ Blood group badge displays

**Check Backend Logs**: Should see donor creation logs

---

### Flow 2: Login & Logout

1. **Open App**: http://localhost:5173
2. **Click**: "Login" button (top right)
3. **Enter Credentials**:
   - Email: `john@example.com`
   - Password: `password123`
4. **Submit**: Click "Login"
5. **Check Results**:
   - ✅ Modal switches to authenticated view
   - ✅ Shows your profile info
   - ✅ Shows blood group, phone, address
6. **Logout**: Click logout button
7. **Check**: Returns to login screen

---

### Flow 3: Search for Donors

1. **Login** (see Flow 2)
2. **Navigate**: Go to "Find Donor"
3. **Fill Search**:
   - Blood Group: `A+` (or select A+)
   - Location: `San Francisco` (or your test location)
   - Radius: `50` (km)
4. **Click**: "🩸 Find Blood Donors"
5. **Check Results**:
   - ✅ Map appears with pins
   - ✅ Donor cards show below
   - ✅ Each card shows: Name, Blood Group, Distance
   - ✅ Call/Email buttons work

---

### Flow 4: Database Verification

```bash
# Connect to database
psql -U bloodfinder -d bloodfinder

# Check donors table
SELECT id, name, email, blood_group, phone FROM donors;

# Count donors
SELECT COUNT(*) FROM donors;

# Check specific user
SELECT * FROM donors WHERE email = 'john@example.com';

# Exit
\q
```

---

## Troubleshooting

### Issue: Database Connection Failed

**Error**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution**:
```bash
# Start PostgreSQL
brew services start postgresql

# Or verify connection
psql -U postgres -c "SELECT version();"
```

---

### Issue: Port Already in Use

**Backend (4000)** or **Frontend (5173)** already running

```bash
# Kill process on port
lsof -i :4000  # Find process
kill -9 <PID>  # Kill it

# Or change port in .env (backend) or vite.config.ts (frontend)
```

---

### Issue: CORS Error

**Error**: `Access to XMLHttpRequest from origin blocked by CORS`

**Solution**: Backend already has CORS enabled. Check if:
- Backend is running (`npm run dev`)
- Frontend proxy is configured (see vite.config.ts)

---

### Issue: Geolocation Returns 404

**Browser Error**: "Location service unavailable"

**Solution**:
- Must be HTTPS in production (or localhost in dev)
- Check browser permissions for location
- Try different location or use manual entry

---

### Issue: Map Not Showing

**Visual**: Blank area where map should be

**Causes & Solutions**:
1. Check browser console for errors (F12 → Console)
2. Verify Leaflet is loaded: `window.L` in console
3. Check network tab for Leaflet CSS/JS
4. Ensure search results exist before map renders

---

## Environment Variables Reference

### Backend (.env)

```env
# Database
DATABASE_URL=postgres://bloodfinder:bloodPassword@localhost:5432/bloodfinder

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Server
PORT=4000
NODE_ENV=development
```

### Frontend (Vite)

Check `frontend/vite.config.ts`:
- API proxy: `/api` → `http://localhost:4000`
- Port: `5173` (auto in dev)

---

## API Endpoints Reference

### Health Check
```bash
GET /health
# Returns: { "ok": true, "timestamp": "...", "uptime": ... }
```

### Authentication
```bash
# Register
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "blood_group": "A+",
  "phone": "+1 555-0123",
  "address": "123 Main St",
  "lat": 37.7749,
  "lng": -122.4194
}

# Login
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "password123"
}

# Returns: { "token": "jwt...", "user": { ... } }
```

### Donors
```bash
# Get all donors
GET /api/donors/all

# Search donors by location
GET /api/donors?blood_group=A+&lat=37.7749&lng=-122.4194&radius_km=50

# Create donor record
POST /api/donors
{
  "name": "Jane Doe",
  "blood_group": "O-",
  "phone": "+1 555-9876",
  "email": "jane@example.com",
  "address": "456 Oak Ave",
  "lat": 37.7750,
  "lng": -122.4195
}
```

---

## Test with cURL

### Register a Donor
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "blood_group": "B+",
    "phone": "+1 555-0000",
    "address": "Test Address",
    "lat": 37.7749,
    "lng": -122.4194
  }'
```

### Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Search Donors
```bash
curl "http://localhost:4000/api/donors?blood_group=B+&lat=37.7749&lng=-122.4194&radius_km=50"
```

---

## Browser DevTools Testing

### Check Network Requests
1. Open DevTools: `F12` or `Cmd+Opt+I`
2. Go to **Network** tab
3. Perform action (register, login, search)
4. View requests:
   - **POST /api/auth/register** → Should return 201 with user data
   - **POST /api/auth/login** → Should return 200 with token
   - **GET /api/donors?...** → Should return 200 with array

### Check Console
1. Go to **Console** tab
2. Should see minimal errors (only expected ones)
3. Check for CORS errors or API failures
4. Watch for validation errors

### Check Storage
1. Go to **Application** tab
2. Check **Cookies** (if using sessions in future)
3. Check **Local Storage** (for current JWT tokens)

---

## Full Testing Checklist

- [ ] Backend starts without errors
- [ ] Database connection works
- [ ] `/health` endpoint responds
- [ ] Frontend starts without errors
- [ ] Homepage loads correctly
- [ ] Navigation works
- [ ] Register form displays
- [ ] Can enter all fields
- [ ] Geolocation button works
- [ ] Form submits successfully
- [ ] Profile displays after register
- [ ] Login form works
- [ ] Can login with credentials
- [ ] Profile shows correct info
- [ ] Logout works
- [ ] Search form displays
- [ ] Can search for donors
- [ ] Map displays with pins
- [ ] Donor cards show results
- [ ] Distance calculation works
- [ ] Contact buttons work (tel/mailto)

---

## Verification Steps

### 1. Verify Backend
```bash
# Check backend is running
curl http://localhost:4000/health

# Check database
psql -U bloodfinder -d bloodfinder -c "SELECT COUNT(*) FROM donors;"

# Check logs (in terminal where npm run dev is running)
# Should see: 🩸 BloodConnect API server running on port 4000
```

### 2. Verify Frontend
```bash
# Navigate to http://localhost:5173
# Should see:
# - BloodConnect logo/title
# - Navigation menu (Home, Find Donor, Register, Login)
# - Hero section
# - CTA buttons

# Check browser console (F12)
# Should have NO errors (maybe some warnings, that's ok)
```

### 3. Verify Forms
```
Register Page:
✅ All fields present and visible
✅ Geolocation button clickable
✅ Submit button functional

Login Page:
✅ Email and password fields
✅ Submit button functional
✅ Link to register page

Search Page:
✅ Blood group selector
✅ Location input
✅ Radius selector
✅ Search button
```

### 4. Verify Database
```bash
psql -U bloodfinder -d bloodfinder

# List tables
\dt

# Check donors
SELECT id, name, email, blood_group FROM donors LIMIT 5;

# Check counts
SELECT COUNT(*) FROM donors;
\q
```

---

## Performance Check

### Check Load Time
1. Open DevTools → **Network** tab
2. Reload page
3. Check:
   - ✅ Index.html: < 500ms
   - ✅ CSS: < 500ms
   - ✅ JavaScript: < 1s
   - ✅ Total page load: < 3s

### Check API Performance
1. Open DevTools → **Network** tab
2. Perform action (search donors)
3. Check:
   - ✅ API request: < 500ms (depending on data)
   - ✅ No timeouts
   - ✅ Status 200/201

---

## Logs to Monitor

### Backend Console
```
🩸 BloodConnect API server running on port 4000
POST /api/auth/register 201 12.34ms
POST /api/auth/login 200 8.56ms
GET /api/donors 200 45.67ms
```

### Frontend Console (F12)
```
Should be clean with maybe some warnings like:
[Vue warn]: Avoid app logic outside setup()
But NO errors blocking functionality
```

---

## Success Criteria

✅ **Backend**: Starts, /health responds, connects to DB  
✅ **Frontend**: Starts, loads without errors  
✅ **Database**: New donors appear in donors table  
✅ **Registration**: Can register new donor with all fields  
✅ **Login**: Can login with registered credentials  
✅ **Profile**: Shows correct user information  
✅ **Search**: Can search for donors by blood group and location  
✅ **Map**: Displays donor locations with pins  
✅ **Contact**: Call/Email buttons work  

If all ✅, your app is working fine!

---

## Next Steps

### If Everything Works ✅
1. Explore the app fully
2. Try different scenarios
3. Check browser DevTools
4. Read [IMPLEMENTATION-CHECKLIST.md](IMPLEMENTATION-CHECKLIST.md) for next phase

### If Something Breaks ❌
1. Check error messages in console
2. Review troubleshooting section above
3. Check logs in terminal
4. Verify database connection
5. Try refreshing page and clearing cache

### To Run New Refactored Frontend
1. Complete the setup above first
2. Read [BACKEND-IMPLEMENTATION.md](BACKEND-IMPLEMENTATION.md)
3. Update backend for session support
4. Serve new HTML files from backend
5. Test new version functions identically

---

## Quick Command Reference

```bash
# Start everything (in separate terminals)

# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend  
cd frontend && npm run dev

# Terminal 3: Database monitoring (optional)
psql -U bloodfinder -d bloodfinder -c "SELECT COUNT(*) FROM donors;"

# Terminal 4: API testing (optional)
watch -n 1 'curl http://localhost:4000/health'
```

---

**Status**: Ready to test! Open http://localhost:5173 🚀

