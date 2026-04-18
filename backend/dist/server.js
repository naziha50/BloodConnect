import cors from "cors";
import express from "express";
import donors from "./routes/donors.js";
import auth from "./routes/auth.js";
const app = express();
app.use(cors());
app.use(express.json());
app.get("/health", (_req, res) => {
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
