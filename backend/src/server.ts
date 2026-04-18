import cors from "cors";
import express, { type Request, type Response } from "express";
import donors from "./routes/donors.js";
import auth from "./routes/auth.js";
import type { HealthResponse } from "./types/index.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req: Request, res: Response<HealthResponse>) => {
	res.json({ 
		ok: true, 
		timestamp: new Date().toISOString(),
		uptime: process.uptime() 
	});
});

app.use("/api/donors", donors);
app.use("/api/auth", auth);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🩸 BloodConnect API server running on port ${PORT}`));
