import { Router } from "express";
import { pool } from "../db/pool.js";
const router = Router();
router.post("/", async (req, res) => {
    const { name, blood_group, phone, email, address, lat, lng } = req.body;
    if (!name || !blood_group || !phone || lat == null || lng == null) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    try {
        const query = `
		INSERT INTO donors (name, blood_group, phone, email, address, lat, lng, location)
		VALUES ($1, $2, $3, $4, $5, $6, $7, ST_SetSRID(ST_MakePoint($7, $6), 4326)::geography)
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
        res.status(201).json(rows[0]);
    }
    catch (error) {
        console.error("Error creating donor:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
router.get("/all", async (req, res) => {
    try {
        const query = `
		SELECT id, name, blood_group, phone, email, address, lat, lng
		FROM donors
		ORDER BY created_at DESC
		LIMIT 500;
		`;
        const { rows } = await pool.query(query);
        res.json(rows);
    }
    catch (error) {
        console.error("Error fetching all donors:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
router.get("/", async (req, res) => {
    const { blood_group, lat, lng, radius_km = "10" } = req.query;
    if (!lat || !lng) {
        return res.status(400).json({ error: "lat and lng are required" });
    }
    try {
        const query = `
		SELECT *,
		ST_Distance(
			location,
			ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
		) / 1000 AS distance_km
		FROM donors
		${blood_group ? "WHERE blood_group = $3" : ""}
		${blood_group ? "AND" : "WHERE"} ST_DWithin(
			location,
			ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
			$${blood_group ? "4" : "3"} * 1000
		)
		ORDER BY distance_km ASC
		LIMIT 100;
		`;
        const values = [Number(lat), Number(lng)];
        if (blood_group) {
            values.push(blood_group, Number(radius_km));
        }
        else {
            values.push(Number(radius_km));
        }
        const { rows } = await pool.query(query, values);
        res.json(rows);
    }
    catch (error) {
        console.error("Error searching donors:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
export default router;
