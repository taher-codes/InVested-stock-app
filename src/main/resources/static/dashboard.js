const symbolForm = document.getElementById("symbolForm");
const symbolSelect = document.getElementById("symbolSelect");
const companyName = document.getElementById("companyName");
const trackedSymbol = document.getElementById("trackedSymbol");
const currentPrice = document.getElementById("currentPrice");
const marketStatus = document.getElementById("marketStatus");
const changePercent = document.getElementById("changePercent");
const volumeValue = document.getElementById("volumeValue");
const peRatio = document.getElementById("peRatio");
const topMovers = document.getElementById("topMovers");
const modelSelect = document.getElementById("modelSelect");
const monthSelect = document.getElementById("monthSelect");
const predictionButton = document.getElementById("predictionButton");
const predictionExplanation = document.getElementById("predictionExplanation");
const resetZoomButton = document.getElementById("resetZoomButton");
const historyRangeSelect = document.getElementById("historyRangeSelect");
const watchlistForm = document.getElementById("watchlistForm");
const watchlistItemId = document.getElementById("watchlistItemId");
const watchlistSymbolSelect = document.getElementById("watchlistSymbolSelect");
const watchlistTargetInput = document.getElementById("watchlistTargetInput");
const watchlistNotesInput = document.getElementById("watchlistNotesInput");
const watchlistSaveButton = document.getElementById("watchlistSaveButton");
const watchlistCancelButton = document.getElementById("watchlistCancelButton");
const watchlistStatus = document.getElementById("watchlistStatus");
const watchlistItems = document.getElementById("watchlistItems");

let priceChart;
let predictionChart;
let currentSymbol = "AAPL";
let currentSeries = [];
let currentWatchlist = [];

const historyRangeLabels = {
    all: "All data",
    "5y": "5 years",
    "2y": "2 years",
    "1y": "1 year",
    "6m": "6 months",
    "3m": "3 months",
    "1m": "1 month"
};

const modelLabels = {
    "linear-regression": "Linear regression",
    "moving-average": "Moving average",
    momentum: "Momentum",
    "mean-reversion": "Mean reversion",
    "exponential-smoothing": "Exponential smoothing",
    "volatility-adjusted": "Volatility adjusted",
    breakout: "Breakout trend"
};

function renderSymbolOptions(stocks) {
    symbolSelect.innerHTML = "";
    watchlistSymbolSelect.innerHTML = "";
    stocks.forEach((stock) => {
        const option = document.createElement("option");
        option.value = stock.symbol;
        option.textContent = `${stock.symbol} - ${stock.companyName}`;
        symbolSelect.appendChild(option);
        watchlistSymbolSelect.appendChild(option.cloneNode(true));
    });
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#039;");
}

function formatModelLabel(model) {
    return modelLabels[model] || model;
}

function getHistoryCutoff(lastDate, range) {
    const cutoff = new Date(lastDate);
    switch (range) {
        case "5y":
            cutoff.setFullYear(cutoff.getFullYear() - 5);
            break;
        case "2y":
            cutoff.setFullYear(cutoff.getFullYear() - 2);
            break;
        case "1y":
            cutoff.setFullYear(cutoff.getFullYear() - 1);
            break;
        case "6m":
            cutoff.setMonth(cutoff.getMonth() - 6);
            break;
        case "3m":
            cutoff.setMonth(cutoff.getMonth() - 3);
            break;
        case "1m":
            cutoff.setMonth(cutoff.getMonth() - 1);
            break;
        default:
            return null;
    }
    return cutoff;
}

function filterSeriesByRange(series) {
    const range = historyRangeSelect.value;
    if (range === "all" || series.length === 0) {
        return series;
    }

    const lastPoint = series[series.length - 1];
    const cutoff = getHistoryCutoff(new Date(lastPoint.label), range);
    if (!cutoff) {
        return series;
    }

    const filtered = series.filter((point) => new Date(point.label) >= cutoff);
    return filtered.length > 0 ? filtered : series;
}

function renderTopMovers(stocks) {
    topMovers.innerHTML = stocks.map((stock) => `
        <article class="list-item">
            <div>
                <strong>${stock.symbol}</strong>
                <p>${stock.companyName}</p>
            </div>
            <div class="list-item-right">
                <strong>${currency(stock.currentPrice)}</strong>
                <span class="${changeClass(stock.changePercent)}">${percent(stock.changePercent)}</span>
            </div>
        </article>
    `).join("");
}

function renderSummary(summary) {
    companyName.textContent = summary.companyName;
    trackedSymbol.textContent = summary.trackedSymbol;
    currentPrice.textContent = currency(summary.currentPrice);
    marketStatus.textContent = summary.marketStatus;
    changePercent.textContent = percent(summary.changePercent);
    changePercent.className = changeClass(summary.changePercent);
    volumeValue.textContent = number(summary.volume);
    peRatio.textContent = `PE ${Number(summary.peRatio).toFixed(2)}`;
}

function renderPriceChart(series, symbol) {
    if (priceChart) {
        priceChart.destroy();
    }

    priceChart = new Chart(document.getElementById("priceChart"), {
        type: "line",
        data: {
            labels: series.map((point) => point.label),
            datasets: [{
                label: `${symbol} Close (${historyRangeLabels[historyRangeSelect.value]})`,
                data: series.map((point) => point.price),
                borderColor: "#0b6e4f",
                backgroundColor: "rgba(11, 110, 79, 0.16)",
                fill: true,
                tension: 0.35,
                pointRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { zoom: zoomOptions() }
        }
    });
}

function renderPredictionChart(data) {
    if (predictionChart) {
        predictionChart.destroy();
    }

    predictionExplanation.textContent = `${data.explanation} Forecast horizon: ${data.months} month(s).`;
    const modelLabel = formatModelLabel(data.model);
    predictionChart = new Chart(document.getElementById("predictionChart"), {
        type: "line",
        data: {
            labels: [...data.history.map((point) => point.label), ...data.forecast.map((point) => point.label)],
            datasets: [
                {
                    label: "History",
                    data: [...data.history.map((point) => point.price), ...new Array(data.forecast.length).fill(null)],
                    borderColor: "#1d4ed8",
                    tension: 0.3
                },
                {
                    label: `${modelLabel} forecast`,
                    data: [...new Array(data.history.length).fill(null), ...data.forecast.map((point) => point.price)],
                    borderColor: "#d97706",
                    borderDash: [8, 6],
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { zoom: zoomOptions() }
        }
    });
}

async function loadPrediction() {
    const data = await fetchJson(`${API_BASE}/prediction?symbol=${encodeURIComponent(currentSymbol)}&model=${encodeURIComponent(modelSelect.value)}&months=${encodeURIComponent(monthSelect.value)}`);
    renderPredictionChart(data);
}

async function loadStockOptions() {
    const stocks = await fetchJson(API_BASE);
    renderSymbolOptions(stocks);
}

function resetWatchlistForm() {
    watchlistItemId.value = "";
    watchlistSymbolSelect.value = currentSymbol;
    watchlistTargetInput.value = "";
    watchlistNotesInput.value = "";
    watchlistSaveButton.textContent = "Add Item";
    watchlistCancelButton.classList.add("hidden");
}

function renderWatchlist(items) {
    currentWatchlist = items;
    watchlistStatus.textContent = `${items.length} saved idea${items.length === 1 ? "" : "s"}`;

    if (items.length === 0) {
        watchlistItems.innerHTML = `<p class="empty-state">No saved ideas yet.</p>`;
        return;
    }

    watchlistItems.innerHTML = items.map((item) => `
        <article class="watchlist-item">
            <div>
                <strong>${escapeHtml(item.symbol)}</strong>
                <p>${escapeHtml(item.companyName)}</p>
                <div class="watchlist-meta">
                    <span>Current ${currency(item.currentPrice)}</span>
                    <span>Target ${currency(item.targetPrice)}</span>
                    <span class="${changeClass(item.changePercent)}">${signedPercent(item.changePercent)}</span>
                </div>
                <p class="watchlist-note">${escapeHtml(item.notes)}</p>
            </div>
            <div class="watchlist-actions">
                <button class="small-button" type="button" data-action="edit" data-id="${item.id}">Edit</button>
                <button class="ghost-button small-button" type="button" data-action="delete" data-id="${item.id}">Delete</button>
            </div>
        </article>
    `).join("");
}

async function sendWatchlistRequest(url, method, payload) {
    const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        throw new Error(`Watchlist request failed with status ${response.status}`);
    }
    return response.status === 204 ? null : response.json();
}

async function loadWatchlist() {
    const items = await fetchJson(WATCHLIST_API);
    renderWatchlist(items);
}

async function saveWatchlistItem() {
    const payload = {
        symbol: watchlistSymbolSelect.value,
        targetPrice: Number(watchlistTargetInput.value),
        notes: watchlistNotesInput.value.trim()
    };
    const id = watchlistItemId.value;
    const url = id ? `${WATCHLIST_API}/${encodeURIComponent(id)}` : WATCHLIST_API;
    const method = id ? "PUT" : "POST";
    await sendWatchlistRequest(url, method, payload);
    resetWatchlistForm();
    await loadWatchlist();
}

function startWatchlistEdit(id) {
    const item = currentWatchlist.find((candidate) => String(candidate.id) === String(id));
    if (!item) {
        return;
    }
    watchlistItemId.value = item.id;
    watchlistSymbolSelect.value = item.symbol;
    watchlistTargetInput.value = Number(item.targetPrice).toFixed(2);
    watchlistNotesInput.value = item.notes;
    watchlistSaveButton.textContent = "Update Item";
    watchlistCancelButton.classList.remove("hidden");
    watchlistTargetInput.focus();
}

async function deleteWatchlistItem(id) {
    const response = await fetch(`${WATCHLIST_API}/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) {
        throw new Error(`Delete failed with status ${response.status}`);
    }
    if (watchlistItemId.value === String(id)) {
        resetWatchlistForm();
    }
    await loadWatchlist();
}

async function loadDashboard(symbol = "AAPL") {
    const [summary, series, movers] = await Promise.all([
        fetchJson(`${API_BASE}/summary?symbol=${encodeURIComponent(symbol)}`),
        fetchJson(`${API_BASE}/series?symbol=${encodeURIComponent(symbol)}`),
        fetchJson(`${API_BASE}/top-movers`)
    ]);

    currentSymbol = summary.trackedSymbol;
    currentSeries = series;
    symbolSelect.value = summary.trackedSymbol;
    if (!watchlistItemId.value) {
        watchlistSymbolSelect.value = summary.trackedSymbol;
    }
    renderSummary(summary);
    renderPriceChart(filterSeriesByRange(currentSeries), summary.trackedSymbol);
    renderTopMovers(movers);
    await loadPrediction();
}

symbolForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await loadDashboard(symbolSelect.value || "AAPL");
});

symbolSelect.addEventListener("change", () => loadDashboard(symbolSelect.value).catch(console.error));
historyRangeSelect.addEventListener("change", () => {
    renderPriceChart(filterSeriesByRange(currentSeries), currentSymbol);
});
modelSelect.addEventListener("change", () => loadPrediction().catch(console.error));
monthSelect.addEventListener("change", () => loadPrediction().catch(console.error));
predictionButton.addEventListener("click", () => loadPrediction().catch(console.error));
watchlistForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveWatchlistItem().catch((error) => {
        watchlistStatus.textContent = "Could not save watchlist item";
        console.error(error);
    });
});
watchlistCancelButton.addEventListener("click", resetWatchlistForm);
watchlistItems.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
        return;
    }
    if (button.dataset.action === "edit") {
        startWatchlistEdit(button.dataset.id);
    }
    if (button.dataset.action === "delete") {
        deleteWatchlistItem(button.dataset.id).catch((error) => {
            watchlistStatus.textContent = "Could not delete watchlist item";
            console.error(error);
        });
    }
});
resetZoomButton.addEventListener("click", () => {
    if (priceChart) {
        priceChart.resetZoom();
    }
    if (predictionChart) {
        predictionChart.resetZoom();
    }
});

loadStockOptions()
    .then(() => Promise.all([
        loadDashboard(symbolSelect.value || "AAPL"),
        loadWatchlist()
    ]))
    .catch((error) => {
        marketStatus.textContent = "Could not load backend data";
        watchlistStatus.textContent = "Could not load watchlist";
        console.error(error);
    });
