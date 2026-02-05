import { Router } from "express";
import { searchCities } from "../services/cityService.js";

const router = Router();

router.get("/cities", async (req, res, next) => {
    try {
        const query = (req.query.q ?? "").toString();
        if (!query.trim()) {
            res.json({ suggestions: [] });
            return;
        }

        const suggestions = await searchCities(query);
        res.json({ suggestions });
    } catch (error) {
        next(error);
    }
});

export default router;
