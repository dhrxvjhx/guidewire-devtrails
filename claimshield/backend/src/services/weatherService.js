// Fetches live weather for all covered cities.
// Falls back to mock data if API key missing — so dev works without a key.

const axios = require('axios');

const CITIES = {
    chennai: { lat: 13.0827, lon: 80.2707, name: 'Chennai' },
    mumbai: { lat: 19.0760, lon: 72.8777, name: 'Mumbai' },
    hyderabad: { lat: 17.3850, lon: 78.4867, name: 'Hyderabad' },
    bengaluru: { lat: 12.9716, lon: 77.5946, name: 'Bengaluru' },
};

// Mock data used when OPENWEATHER_API_KEY is not set
const MOCK_WEATHER = {
    chennai: { rainfall: 67, temp: 29, aqi: 142, condition: 'Thunderstorm', alertLevel: 'RED' },
    mumbai: { rainfall: 12, temp: 31, aqi: 88, condition: 'Light Rain', alertLevel: 'GREEN' },
    hyderabad: { rainfall: 0, temp: 44, aqi: 95, condition: 'Clear', alertLevel: 'AMBER' },
    bengaluru: { rainfall: 2, temp: 27, aqi: 61, condition: 'Partly Cloudy', alertLevel: 'GREEN' },
};

async function fetchCityWeather(cityKey) {
    const city = CITIES[cityKey];
    if (!city) throw new Error(`Unknown city: ${cityKey}`);

    const apiKey = process.env.OPENWEATHER_API_KEY;

    // No API key — return mock data (dev mode)
    if (!apiKey || apiKey === 'your_openweather_api_key') {
        console.log(`[WEATHER] Using mock data for ${city.name} (no API key)`);
        return { city: cityKey, ...MOCK_WEATHER[cityKey], source: 'mock' };
    }

    try {
        const [currentRes, forecastRes] = await Promise.all([
            axios.get('https://api.openweathermap.org/data/2.5/weather', {
                params: { lat: city.lat, lon: city.lon, appid: apiKey, units: 'metric' },
                timeout: 8000,
            }),
            axios.get('https://api.openweathermap.org/data/2.5/forecast', {
                params: { lat: city.lat, lon: city.lon, appid: apiKey, units: 'metric', cnt: 1 },
                timeout: 8000,
            }),
        ]);

        const current = currentRes.data;
        const rainfall = current.rain?.['1h'] || current.rain?.['3h'] || 0;
        const temp = current.main.temp;
        const condition = current.weather?.[0]?.main || 'Clear';

        // Determine alert level
        let alertLevel = 'GREEN';
        if (rainfall > 45 || temp > 42) alertLevel = 'RED';
        else if (rainfall > 25 || temp > 38) alertLevel = 'AMBER';

        return {
            city: cityKey,
            rainfall: Math.round(rainfall * 10) / 10,
            temp: Math.round(temp * 10) / 10,
            aqi: 0,          // AQI needs separate API call — added in Pro plan
            condition,
            alertLevel,
            humidity: current.main.humidity,
            windSpeed: current.wind?.speed || 0,
            source: 'live',
            rawData: { weatherId: current.weather?.[0]?.id },
        };
    } catch (err) {
        console.error(`[WEATHER] API error for ${city.name}:`, err.message);
        // Fall back to mock on API failure so scheduler keeps running
        return { city: cityKey, ...MOCK_WEATHER[cityKey], source: 'fallback' };
    }
}

async function fetchAllCities() {
    const results = await Promise.allSettled(
        Object.keys(CITIES).map(c => fetchCityWeather(c))
    );

    return results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);
}

module.exports = { fetchAllCities, fetchCityWeather, CITIES };