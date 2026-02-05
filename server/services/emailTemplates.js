import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EMAILS_DIR = path.join(__dirname, "..", "..", "emails");

const templateCache = new Map();

const loadTemplate = async (templateName) => {
    if (templateCache.has(templateName)) {
        return templateCache.get(templateName);
    }

    const filePath = path.join(EMAILS_DIR, `${templateName}.html`);
    const contents = await readFile(filePath, "utf8");
    templateCache.set(templateName, contents);
    return contents;
};

const renderTemplate = async (templateName, replacements = {}) => {
    const template = await loadTemplate(templateName);

    const rendered = Object.entries(replacements).reduce((html, [key, value]) => {
        const token = new RegExp(`{{\\s*${key}\\s*}}`, "g");
        return html.replace(token, value ?? "");
    }, template);

    return rendered;
};

const getSampleWeatherData = () => ({
    CITY_NAME: "Bhubaneswar",
    DATE: new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    }),
    TEMP: "27",
    WEATHER_DESCRIPTION: "Partly cloudy with a light breeze",
    TEMP_MIN: "24",
    TEMP_MAX: "30",
    HUMIDITY: "68",
    WIND_SPEED: "9",
    RAIN_CHANCE: "15",
    WEATHER_ICON_URL: "https://openweathermap.org/img/wn/03d@2x.png",
    UNSUBSCRIBE_LINK: "https://weathermail.com/preferences",
    YEAR: new Date().getFullYear().toString(),
});

const getSampleWelcomeData = () => ({
    CITY_NAME: "Bhubaneswar",
    YEAR: new Date().getFullYear().toString(),
    UNSUBSCRIBE_LINK: "https://weathermail.com/preferences",
    LOGO_URL: "https://raw.githubusercontent.com/Sarbeswarpanda04/Weather-mail/refs/heads/main/public/assets/images/emailheaderlogo.png",
});

export { renderTemplate, getSampleWeatherData, getSampleWelcomeData };
