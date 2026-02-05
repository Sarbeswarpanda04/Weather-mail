import { getSampleWeatherData } from "./emailTemplates.js";

const API_KEY = process.env.OPENWEATHER_API_KEY;
const API_BASE = "https://api.openweathermap.org/data/2.5/weather";

const formatDate = (date = new Date()) =>
    date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    });

const buildFallbackData = (city) => {
    const sample = getSampleWeatherData();
    return {
        ...sample,
        CITY_NAME: city,
        DATE: formatDate(),
        UNSUBSCRIBE_LINK: process.env.UNSUBSCRIBE_URL ?? sample.UNSUBSCRIBE_LINK,
    };
};

const formatWeatherPayload = (city, payload) => {
    const date = new Date();
    const { main = {}, weather = [], wind = {}, rain = {}, clouds = {} } = payload;
    const primaryWeather = weather[0] ?? {};

    const rainChance = typeof payload.pop === "number"
        ? Math.round(payload.pop * 100)
        : Math.min(100, Math.round(clouds.all ?? 0));

    const iconCode = primaryWeather.icon ?? "01d";

    return {
        CITY_NAME: city,
        DATE: formatDate(date),
        TEMP: Math.round(main.temp ?? 0).toString(),
        WEATHER_DESCRIPTION: primaryWeather.description
            ? primaryWeather.description.replace(/\b\w/g, (char) => char.toUpperCase())
            : "Weather update",
        TEMP_MIN: Math.round(main.temp_min ?? main.temp ?? 0).toString(),
        TEMP_MAX: Math.round(main.temp_max ?? main.temp ?? 0).toString(),
        HUMIDITY: Math.round(main.humidity ?? 0).toString(),
        WIND_SPEED: Math.round((wind.speed ?? 0) * 3.6).toString(),
        RAIN_CHANCE: rainChance.toString(),
        WEATHER_ICON_URL: `https://openweathermap.org/img/wn/${iconCode}@2x.png`,
        UNSUBSCRIBE_LINK: process.env.UNSUBSCRIBE_URL ?? "https://weathermail.com/preferences",
        YEAR: date.getFullYear().toString(),
    };
};

const fetchWeatherForCity = async (city) => {
    if (!API_KEY) {
        return buildFallbackData(city);
    }

    try {
        const response = await fetch(`${API_BASE}?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`);
        if (!response.ok) {
            throw new Error(`Weather API error: ${response.status}`);
        }
        const payload = await response.json();
        return formatWeatherPayload(city, payload);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`Falling back to sample weather for ${city}:`, error.message);
        return buildFallbackData(city);
    }
};

export { fetchWeatherForCity };
