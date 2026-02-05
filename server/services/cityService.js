const GEO_API_BASE = "https://api.openweathermap.org/geo/1.0/direct";
const FALLBACK_CITIES = [
    "Bhubaneswar",
    "Mumbai",
    "Delhi",
    "Bengaluru",
    "Kolkata",
    "Chennai",
    "Hyderabad",
    "Pune",
    "Ahmedabad",
    "Jaipur",
    "London",
    "New York",
    "San Francisco",
    "Tokyo",
    "Sydney",
];

const dedupeCities = (cities) => {
    const seen = new Set();
    return cities.filter((entry) => {
        const key = entry.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const mapGeoResponse = (payload) =>
    Array.isArray(payload)
        ? payload
              .filter((item) => item?.name)
              .map((item) => {
                  const parts = [item.name];
                  if (item.state) parts.push(item.state);
                  if (item.country) parts.push(item.country);
                  return parts.join(", ");
              })
        : [];

const searchCities = async (query) => {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
        return FALLBACK_CITIES.filter((city) => city.toLowerCase().includes(trimmed.toLowerCase())).slice(0, 5);
    }

    try {
        const response = await fetch(`${GEO_API_BASE}?q=${encodeURIComponent(trimmed)}&limit=5&appid=${apiKey}`);
        if (!response.ok) throw new Error(`Geo API error: ${response.status}`);
        const payload = await response.json();
        const results = mapGeoResponse(payload);
        if (results.length === 0) {
            return FALLBACK_CITIES.filter((city) => city.toLowerCase().includes(trimmed.toLowerCase())).slice(0, 5);
        }
        return dedupeCities(results);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.warn("City lookup failed, falling back to static list", error.message);
        return FALLBACK_CITIES.filter((city) => city.toLowerCase().includes(trimmed.toLowerCase())).slice(0, 5);
    }
};

export { searchCities };
