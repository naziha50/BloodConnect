# Backend Implementation Guide: HTML Form Submission Support

## Overview

This guide explains the backend changes needed to support the refactored HTML/CSS-only frontend with minimal JavaScript.

---

## Key Changes Required

### 1. **Session-Based Authentication** (Instead of JWT)

Replace JWT `localStorage` approach with HTTP-only session cookies.

#### Installation

```bash
npm install express-session connect-pg-simple
```

#### Configuration

```typescript
import session from 'express-session';
import pgSession from 'connect-pg-simple';

const pgStore = pgSession(session);

app.use(session({
  store: new pgStore({
    pool: pool, // Reuse your existing connection pool
    tableName: 'session' // Sessions stored in DB
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-min-32-chars',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevents JS access (security feature)
    sameSite: 'strict', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));
```

#### Create Sessions Table

```sql
CREATE TABLE session (
  sid varchar NOT NULL COLLATE "default",
  sess json NOT NULL,
  expire timestamp(6) NOT NULL,
  PRIMARY KEY (sid)
);
```

---

### 2. **Form Parsing Middleware**

```typescript
// Parse URL-encoded form data (from HTML forms)
app.use(express.urlencoded({ extended: true }));

// Also keep JSON parsing for API clients
app.use(express.json());
```

---

### 3. **Authentication Routes**

#### Login Route (Form Submission)

```typescript
app.post('/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).render('login', { 
      error: 'Email and password are required' 
    });
  }

  try {
    // Find user by email
    const result = await pool.query(
      'SELECT id, name, email, password_hash, blood_group, phone, address FROM donors WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).render('login', { 
        error: 'Invalid email or password' 
      });
    }

    const user = result.rows[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).render('login', { 
        error: 'Invalid email or password' 
      });
    }

    // Set session
    (req.session as any).userId = user.id;

    // Redirect to profile
    res.redirect('/profile');
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).render('login', { 
      error: 'An error occurred during login' 
    });
  }
});
```

#### Register Route (Form Submission)

```typescript
app.post('/auth/register', async (req: Request, res: Response) => {
  const { name, email, password, blood_group, phone, address, lat, lng } = req.body;

  // Validate all required fields
  if (!name || !email || !password || !blood_group || !phone || lat == null || lng == null) {
    return res.status(400).render('register', { 
      error: 'All fields are required' 
    });
  }

  // Validate password length
  if (password.length < 6) {
    return res.status(400).render('register', { 
      error: 'Password must be at least 6 characters' 
    });
  }

  // Validate email format
  if (!isValidEmail(email)) {
    return res.status(400).render('register', { 
      error: 'Please enter a valid email address' 
    });
  }

  try {
    // Check if email already exists
    const checkEmail = await pool.query(
      'SELECT id FROM donors WHERE email = $1',
      [email]
    );

    if (checkEmail.rows.length > 0) {
      return res.status(409).render('register', { 
        error: 'Email already registered' 
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      `INSERT INTO donors (name, email, password_hash, blood_group, phone, address, lat, lng)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, email, blood_group, phone, address`,
      [name, email, passwordHash, blood_group, phone, address, lat, lng]
    );

    const newUser = result.rows[0];

    // Set session
    (req.session as any).userId = newUser.id;

    // Redirect to profile
    res.redirect('/profile');
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).render('register', { 
      error: 'An error occurred during registration' 
    });
  }
});
```

#### Logout Route

```typescript
app.post('/auth/logout', (req: Request, res: Response) => {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).render('index', { 
        error: 'Error logging out' 
      });
    }
    res.redirect('/');
  });
});
```

---

### 4. **Authentication Middleware**

```typescript
// Middleware to check if user is authenticated
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!(req.session as any).userId) {
    return res.redirect('/login');
  }
  next();
}

// Middleware to get current user
async function getCurrentUser(req: Request) {
  if (!(req.session as any).userId) return null;

  const result = await pool.query(
    'SELECT id, name, email, blood_group, phone, address, available, last_donation_date, created_at FROM donors WHERE id = $1',
    [(req.session as any).userId]
  );

  return result.rows[0] || null;
}
```

---

### 5. **Profile Page Route**

```typescript
app.get('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req);

    if (!user) {
      return res.redirect('/login');
    }

    res.render('profile', { user });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).render('profile', { 
      error: 'Error loading profile' 
    });
  }
});
```

---

### 6. **Search Route (Handle GET Form Submission)**

```typescript
app.get('/search', async (req: Request, res: Response) => {
  const { blood_group, location, radius_km = '50' } = req.query;

  // Validate input
  if (!blood_group || !location) {
    return res.status(400).json({ 
      error: 'Blood group and location are required' 
    });
  }

  try {
    // Get coordinates from location string using Nominatim
    const geocodeResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location as string)}&limit=1`
    );
    const geocodeData = await geocodeResponse.json();

    if (!geocodeData.length) {
      return res.status(400).json({ 
        error: 'Location not found' 
      });
    }

    const { lat, lon: lng } = geocodeData[0];
    const radiusKm = Number(radius_km);

    // Query donors with Haversine formula
    const result = await pool.query(
      `SELECT 
        id, name, blood_group, phone, email, address, lat, lng,
        (6371 * acos(
          cos(radians($1)) * cos(radians(lat)) * cos(radians(lng) - radians($2))
          + sin(radians($1)) * sin(radians(lat))
        )) AS distance_km
       FROM donors
       WHERE blood_group = $3
       HAVING (6371 * acos(
         cos(radians($1)) * cos(radians(lat)) * cos(radians(lng) - radians($2))
         + sin(radians($1)) * sin(radians(lat))
       )) <= $4
       ORDER BY distance_km ASC
       LIMIT 100`,
      [lat, lng, blood_group, radiusKm]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      error: 'Search failed' 
    });
  }
});
```

---

### 7. **View/Template Rendering**

Set up template engine (EJS or Handlebars):

```typescript
import express from 'express';
import path from 'path';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../frontend'));

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend')));
```

#### Home Route

```typescript
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../frontend/index-refactored.html'));
});
```

---

### 8. **Error Handling Middleware**

```typescript
// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).render('404', {
    url: req.url
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).render('error', {
    error: process.env.NODE_ENV === 'production' 
      ? 'An error occurred' 
      : err.message
  });
});
```

---

### 9. **Email Validation Helper**

```typescript
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
  return phoneRegex.test(phone);
}
```

---

## Database Schema Updates

### Add password column (if not exists)

```sql
ALTER TABLE donors ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE donors ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE donors ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE donors ADD COLUMN available BOOLEAN DEFAULT TRUE;
ALTER TABLE donors ADD COLUMN last_donation_date DATE;
```

---

## Complete Server Example

```typescript
// backend/src/server.ts
import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import bcrypt from 'bcrypt';
import path from 'path';
import { pool } from './db/pool.js';

const app = express();
const pgStore = pgSession(session);

// ============ MIDDLEWARE ============
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Session configuration
app.use(session({
  store: new pgStore({ pool, tableName: 'session' }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../frontend'));

// ============ AUTHENTICATION MIDDLEWARE ============
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!(req.session as any).userId) {
    return res.redirect('/login');
  }
  next();
}

async function getCurrentUser(req: Request) {
  if (!(req.session as any).userId) return null;
  const result = await pool.query(
    'SELECT * FROM donors WHERE id = $1',
    [(req.session as any).userId]
  );
  return result.rows[0] || null;
}

// ============ ROUTES ============

// Home
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index-refactored.html'));
});

// Login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login-refactored.html'));
});

app.post('/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).render('login-refactored', { 
      error: 'Email and password required' 
    });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, password_hash FROM donors WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).render('login-refactored', { 
        error: 'Invalid credentials' 
      });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).render('login-refactored', { 
        error: 'Invalid credentials' 
      });
    }

    (req.session as any).userId = user.id;
    res.redirect('/profile');
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).render('login-refactored', { 
      error: 'Login failed' 
    });
  }
});

// Register
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/register-refactored.html'));
});

app.post('/auth/register', async (req: Request, res: Response) => {
  const { name, email, password, blood_group, phone, address, lat, lng } = req.body;

  if (!name || !email || !password || !blood_group || !phone || lat == null || lng == null) {
    return res.status(400).render('register-refactored', { 
      error: 'All fields required' 
    });
  }

  if (password.length < 6) {
    return res.status(400).render('register-refactored', { 
      error: 'Password must be at least 6 characters' 
    });
  }

  try {
    const checkEmail = await pool.query(
      'SELECT id FROM donors WHERE email = $1',
      [email]
    );

    if (checkEmail.rows.length > 0) {
      return res.status(409).render('register-refactored', { 
        error: 'Email already registered' 
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO donors (name, email, password_hash, blood_group, phone, address, lat, lng)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [name, email, passwordHash, blood_group, phone, address, lat, lng]
    );

    (req.session as any).userId = result.rows[0].id;
    res.redirect('/profile');
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).render('register-refactored', { 
      error: 'Registration failed' 
    });
  }
});

// Profile
app.get('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req);
    res.render('profile-refactored', { user });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).render('profile-refactored', { error: 'Error loading profile' });
  }
});

// Logout
app.post('/auth/logout', (req: Request, res: Response) => {
  req.session.destroy((error) => {
    if (error) {
      return res.redirect('/');
    }
    res.redirect('/');
  });
});

// Search
app.get('/search', async (req: Request, res: Response) => {
  const { blood_group, location, radius_km = '50' } = req.query;

  if (!blood_group || !location) {
    return res.status(400).json({ error: 'Blood group and location required' });
  }

  try {
    // Geocode location (using Nominatim)
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location as string)}&limit=1`
    );
    const geoData = await geoRes.json();

    if (!geoData.length) {
      return res.status(400).json({ error: 'Location not found' });
    }

    const { lat, lon: lng } = geoData[0];
    const radiusKm = Number(radius_km);

    // Search donors
    const result = await pool.query(
      `SELECT 
        id, name, blood_group, phone, email, address, lat, lng,
        (6371 * acos(
          cos(radians($1)) * cos(radians(lat)) * cos(radians(lng) - radians($2))
          + sin(radians($1)) * sin(radians(lat))
        )) AS distance_km
       FROM donors
       WHERE blood_group = $3
       HAVING (6371 * acos(
         cos(radians($1)) * cos(radians(lat)) * cos(radians(lng) - radians($2))
         + sin(radians($1)) * sin(radians(lat))
       )) <= $4
       ORDER BY distance_km ASC
       LIMIT 100`,
      [lat, lng, blood_group, radiusKm]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

---

## Testing Checklist

- [ ] Form submission works without JavaScript
- [ ] Session cookie is set after login
- [ ] Unauthenticated users redirected to login
- [ ] Logout destroys session
- [ ] Search API works
- [ ] Profile page renders user data
- [ ] Form validation works server-side
- [ ] Error messages display correctly

---

## Security Notes

1. **HttpOnly Cookies**: Sessions cannot be accessed by JavaScript (prevents XSS attacks)
2. **CSRF Protection**: Use middleware like `csurf` for additional protection
3. **Password Hashing**: Always use bcrypt or similar for passwords
4. **Rate Limiting**: Add rate limiting to login/register endpoints
5. **HTTPS Only**: Use `secure: true` in production for cookies

