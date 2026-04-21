const API_BASE = "/api/stocks";
const TRAINING_API = "/api/training";

async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }
    return response.json();
}

async function fetchOptionalJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (response.status === 404) {
        return null;
    }
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }
    return response.json();
}

function currency(value) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2
    }).format(Number(value));
}

function compactCurrency(value) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 1
    }).format(Number(value));
}

function number(value) {
    return new Intl.NumberFormat("en-US").format(Number(value));
}

function percent(value) {
    return `${Number(value).toFixed(2)}%`;
}

function signedPercent(value) {
    const numericValue = Number(value);
    return `${numericValue > 0 ? "+" : ""}${numericValue.toFixed(2)}%`;
}

function changeClass(value) {
    return Number(value) < 0 ? "negative" : "positive";
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number(value)));
}

function zoomOptions() {
    return {
        zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: "x"
        },
        pan: {
            enabled: true,
            mode: "x"
        }
    };
}
