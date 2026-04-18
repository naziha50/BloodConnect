import { Router, type Request, type Response } from "express";
import { pool } from "../db/pool.js";
import type { 
	Donor, 
	CreateDonorRequest, 
	SearchDonorsQuery, 
	CreateDonorResponse, 
	SearchDonorsResponse 
} from "../types/index.js";

const router = Router();

router.post("/", async (req: Request<object, CreateDonorResponse, CreateDonorRequest>, res: Response<CreateDonorResponse | { error: string }>) => {
	const { name, blood_group, phone, email, address, lat, lng } = req.body;
	if (!name || !blood_group || !phone || lat == null || lng == null) {
		return res.status(400).json({ error: "Missing required fields" });
	}

	try {
		const query = `
		INSERT INTO donors (name, blood_group, phone, email, address, lat, lng)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING *;
		`;
		const values = [
			name,
			blood_group,
			phone,
			email || null,
			address || null,
			lat,
			lng,
		];

		const { rows } = await pool.query(query, values);
		res.status(201).json(rows[0] as Donor);
	} catch (error) {
		console.error("Error creating donor:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

router.get("/all", async (req: Request, res: Response<Donor[] | { error: string }>) => {
	try {
		const query = `
		SELECT id, name, blood_group, phone, email, address, lat, lng, available, last_donation_date
		FROM donors
		ORDER BY created_at DESC
		LIMIT 500;
		`;

		const { rows } = await pool.query(query);
		res.json(rows as Donor[]);
	} catch (error) {
		console.error("Error fetching all donors:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

router.get("/", async (req: Request<object, SearchDonorsResponse, object, SearchDonorsQuery>, res: Response<SearchDonorsResponse | { error: string }>) => {
	const { blood_group, lat, lng, radius_km = "10", availability } = req.query;
	
	if (!lat || !lng) {
		return res.status(400).json({ error: "lat and lng are required" });
	}

	const userLat = Number(lat);
	const userLng = Number(lng);
	const radiusKm = Number(radius_km);

	try {
		const values: (number | string)[] = [userLat, userLng, radiusKm];
		const conditions: string[] = [];
		let paramIdx = 4;

		// Haversine radius condition
		conditions.push(`
			(6371 * acos(
				cos(radians($1)) * cos(radians(lat)) * cos(radians(lng) - radians($2))
				+ sin(radians($1)) * sin(radians(lat))
			)) <= $3
		`);

		// Optional blood group filter
		if (blood_group) {
			conditions.push(`blood_group = $${paramIdx}`);
			values.push(blood_group);
			paramIdx++;
		}

		// Optional availability filter (hardcoded SQL, not user-supplied)
		if (availability === 'available') {
			conditions.push('available = TRUE');
		} else if (availability === 'unavailable') {
			conditions.push('available = FALSE');
		}

		const whereClause = `WHERE ${conditions.join(' AND ')}`;

		const query = `
		SELECT id, name, blood_group, phone, email, address, lat, lng, available, last_donation_date,
			6371 * acos(
				cos(radians($1)) * cos(radians(lat)) * cos(radians(lng) - radians($2))
				+ sin(radians($1)) * sin(radians(lat))
			) AS distance_km
		FROM donors
		${whereClause}
		ORDER BY distance_km ASC
		LIMIT 100;
		`;

		const { rows } = await pool.query(query, values);
		res.json(rows as Donor[]);
	} catch (error) {
		console.error("Error searching donors:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

export default router;
