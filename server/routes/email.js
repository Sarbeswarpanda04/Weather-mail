import { Router } from "express";
import { renderTemplate, getSampleWeatherData, getSampleWelcomeData } from "../services/emailTemplates.js";

const router = Router();

router.get("/sample", async (req, res, next) => {
    try {
        const template = req.query.template ?? "daily-weather";

        if (template === "daily-weather") {
            const html = await renderTemplate(template, getSampleWeatherData());
            res.json({ html });
            return;
        }

        if (template === "welcome") {
            const html = await renderTemplate(template, getSampleWelcomeData());
            res.json({ html });
            return;
        }

        res.status(400).json({ message: "Unsupported template" });
    } catch (error) {
        next(error);
    }
});

export default router;
