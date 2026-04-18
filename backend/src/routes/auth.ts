import { Router, type Request, type Response } from "express";
import { pool } from "../db/pool.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { StringValue } from "ms";
import type { RegisterRequest, LoginRequest, AuthResponse } from "../types/index.js";

const router = Router();

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production-min-32-chars';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-this-in-production-min-32-chars';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN: string = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const SALT_ROUNDS = 10;

// Hash password using bcrypt with automatic salting
const hashPassword = async (password: string): Promise<string> => {
	return await bcrypt.hash(password, SALT_ROUNDS);
};

// Verify password against hash
const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
	return await bcrypt.compare(password, hash);
};

// Generate JWT access token
const generateToken = (userId: number): string => {
	const options: jwt.SignOptions = {
		expiresIn: JWT_EXPIRES_IN as StringValue
	};
	return jwt.sign({ userId }, JWT_SECRET, options);
};

// Generate JWT refresh token
const generateRefreshToken = (userId: number): string => {
	const options: jwt.SignOptions = {
		expiresIn: JWT_REFRESH_EXPIRES_IN as StringValue
	};
	return jwt.sign({ userId }, JWT_REFRESH_SECRET, options);
};

// Verify JWT token
const verifyToken = (token: string): number | null => {
	try {
		const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
		return decoded.userId;
	} catch {
		return null;
	}
};

// Verify refresh token
const verifyRefreshToken = (token: string): number | null => {
	try {
		const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { userId: number };
		return decoded.userId;
	} catch {
		return null;
	}
};

// Register endpoint
router.post("/register", async (req: Request<object, AuthResponse, RegisterRequest>, res: Response<AuthResponse | { error: string }>) => {
	const { name, email, password, blood_group, phone, address, lat, lng } = req.body;

	if (!name || !email || !password || !blood_group || !phone || lat == null || lng == null) {
		res.status(400).json({ error: "Missing required fields" });
		return;
	}

	try {
		// Check if email already exists
		const checkQuery = "SELECT id FROM donors WHERE email = $1";
		const checkResult = await pool.query(checkQuery, [email]);

		if (checkResult.rows.length > 0) {
			res.status(409).json({ error: "Email already registered" });
			return;
		}

		// Hash password with bcrypt (includes automatic salting)
		const passwordHash = await hashPassword(password);

		const query = `
			INSERT INTO donors (name, email, password_hash, blood_group, phone, address, lat, lng, location)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ST_SetSRID(ST_MakePoint($9, $10), 4326))
			RETURNING id, name, email, blood_group, phone, address, lat, lng
		`;
		
		const result = await pool.query(query, [
			name,
			email,
			passwordHash,
			blood_group,
			phone,
			address || null,
			lat,
			lng,
			lng, // PostGIS uses lng, lat order
			lat
		]);

		const user = result.rows[0];
		const token = generateToken(user.id);
		const refreshToken = generateRefreshToken(user.id);

		res.status(201).json({
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				blood_group: user.blood_group,
				phone: user.phone,
				address: user.address,
				lat: user.lat,
				lng: user.lng
			},
			token,
			refreshToken
		});
	} catch (error) {
		console.error("Registration error:", error);
		res.status(500).json({ error: "Failed to register user" });
	}
});

// Login endpoint
router.post("/login", async (req: Request<object, AuthResponse, LoginRequest>, res: Response<AuthResponse | { error: string }>) => {
	const { email, password } = req.body;

	if (!email || !password) {
		res.status(400).json({ error: "Email and password are required" });
		return;
	}

	try {
		const query = `
			SELECT id, name, email, password_hash, blood_group, phone, address, lat, lng
			FROM donors
			WHERE email = $1
		`;
		
		const result = await pool.query(query, [email]);

		if (result.rows.length === 0) {
			res.status(401).json({ error: "Invalid email or password" });
			return;
		}

		const user = result.rows[0];
		
		// Verify password using bcrypt
		const isPasswordValid = await verifyPassword(password, user.password_hash);

		if (!isPasswordValid) {
			res.status(401).json({ error: "Invalid email or password" });
			return;
		}

		const token = generateToken(user.id);
		const refreshToken = generateRefreshToken(user.id);

		res.json({
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				blood_group: user.blood_group,
				phone: user.phone,
				address: user.address,
				lat: user.lat,
				lng: user.lng
			},
			token,
			refreshToken
		});
	} catch (error) {
		console.error("Login error:", error);
		res.status(500).json({ error: "Failed to login" });
	}
});

// Get profile endpoint (requires authentication)
router.get("/profile", async (req: Request, res: Response) => {
	const authHeader = req.headers.authorization;
	
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		res.status(401).json({ error: "Unauthorized" });
		return;
	}

	const token = authHeader.substring(7);
	const userId = verifyToken(token);

	if (!userId) {
		res.status(401).json({ error: "Invalid token" });
		return;
	}

	try {
		const query = `
			SELECT id, name, email, blood_group, phone, address, lat, lng
			FROM donors
			WHERE id = $1
		`;
		
		const result = await pool.query(query, [userId]);

		if (result.rows.length === 0) {
			res.status(404).json({ error: "User not found" });
			return;
		}

		res.json(result.rows[0]);
	} catch (error) {
		console.error("Profile fetch error:", error);
		res.status(500).json({ error: "Failed to fetch profile" });
	}
});

// Update profile endpoint (requires authentication)
router.put("/profile", async (req: Request, res: Response) => {
	const authHeader = req.headers.authorization;
	
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		res.status(401).json({ error: "Unauthorized" });
		return;
	}

	const token = authHeader.substring(7);
	const userId = verifyToken(token);

	if (!userId) {
		res.status(401).json({ error: "Invalid token" });
		return;
	}

	const { name, phone, address, blood_group } = req.body;

	try {
		const query = `
			UPDATE donors
			SET name = COALESCE($1, name),
			    phone = COALESCE($2, phone),
			    address = COALESCE($3, address),
			    blood_group = COALESCE($4, blood_group)
			WHERE id = $5
			RETURNING id, name, email, blood_group, phone, address, lat, lng
		`;
		
		const result = await pool.query(query, [name, phone, address, blood_group, userId]);

		if (result.rows.length === 0) {
			res.status(404).json({ error: "User not found" });
			return;
		}

		res.json(result.rows[0]);
	} catch (error) {
		console.error("Profile update error:", error);
		res.status(500).json({ error: "Failed to update profile" });
	}
});

// Refresh token endpoint
router.post("/refresh", async (req: Request, res: Response) => {
	const { refreshToken } = req.body;

	if (!refreshToken) {
		res.status(400).json({ error: "Refresh token is required" });
		return;
	}

	const userId = verifyRefreshToken(refreshToken);

	if (!userId) {
		res.status(401).json({ error: "Invalid or expired refresh token" });
		return;
	}

	try {
		// Generate new access token
		const newToken = generateToken(userId);
		const newRefreshToken = generateRefreshToken(userId);

		res.json({
			token: newToken,
			refreshToken: newRefreshToken
		});
	} catch (error) {
		console.error("Token refresh error:", error);
		res.status(500).json({ error: "Failed to refresh token" });
	}
});

export default router;
