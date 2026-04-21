const lessonList = document.getElementById("lessonList");
const companySelect = document.getElementById("companySelect");
const sectorFilter = document.getElementById("sectorFilter");
const rankingMetric = document.getElementById("rankingMetric");
const quantityInput = document.getElementById("quantityInput");
const thesisInput = document.getElementById("thesisInput");
const buyButton = document.getElementById("buyButton");
const sellButton = document.getElementById("sellButton");
const riskButton = document.getElementById("riskButton");
const resetPortfolioButton = document.getElementById("resetPortfolioButton");
const resetUniverseZoomButton = document.getElementById("resetUniverseZoomButton");
const resetDetailZoomButton = document.getElementById("resetDetailZoomButton");
const simulationFeedback = document.getElementById("simulationFeedback");
const universeLeaderboard = document.getElementById("universeLeaderboard");
const companyBriefing = document.getElementById("companyBriefing");
const holdingsList = document.getElementById("holdingsList");
const tradeLog = document.getElementById("tradeLog");
const arenaCompanyCount = document.getElementById("arenaCompanyCount");
const arenaAdvancers = document.getElementById("arenaAdvancers");
const arenaAveragePe = document.getElementById("arenaAveragePe");
const arenaTopSector = document.getElementById("arenaTopSector");
const arenaDataSource = document.getElementById("arenaDataSource");
const portfolioCash = document.getElementById("portfolioCash");
const portfolioInvested = document.getElementById("portfolioInvested");
const portfolioUnrealized = document.getElementById("portfolioUnrealized");
const portfolioRealized = document.getElementById("portfolioRealized");
const portfolioExposure = document.getElementById("portfolioExposure");
const portfolioWinRate = document.getElementById("portfolioWinRate");
const selectedTeachingPrompt = document.getElementById("selectedTeachingPrompt");
const selectedRiskPrompt = document.getElementById("selectedRiskPrompt");
const selectedSizingPrompt = document.getElementById("selectedSizingPrompt");
const selectedDatasetPrompt = document.getElementById("selectedDatasetPrompt");

const STARTER_CASH = 100000;
const TRAINING_STORAGE_KEY = "invested-training-simulator-v2";
const TARGET_UNIVERSE_SIZE = 500;
const HISTORY_POINTS = 120;

let universeChart;
let companyPriceChart;
let companySignalChart;
let companyScoreChart;
let trainingSourceLabel = "Offline training arena";
let companyUniverse = [];
let selectedSymbol = null;
let tradingCalendar;
let liveSelectionRequestId = 0;
let portfolio = loadPortfolio();

const sectorModels = {
    Technology: {
        code: "T",
        peBase: 31,
        peSpread: 18,
        dividendBase: 0.55,
        dividendSpread: 1.1,
        prefixes: ["Quantum", "Nimbus", "Vertex", "Helix", "Nova", "Orbit", "Atlas", "Prism"],
        suffixes: ["Systems", "Compute", "Semiconductor", "Networks", "Cloud", "Labs", "Platforms", "Robotics"]
    },
    "Communication Services": {
        code: "C",
        peBase: 24,
        peSpread: 14,
        dividendBase: 0.3,
        dividendSpread: 0.9,
        prefixes: ["Signal", "Pulse", "Echo", "Relay", "Stream", "Canvas", "Bridge", "Civic"],
        suffixes: ["Media", "Networks", "Digital", "Studios", "Comms", "Interactive", "Broadcast", "Connect"]
    },
    "Consumer Discretionary": {
        code: "D",
        peBase: 26,
        peSpread: 16,
        dividendBase: 0.35,
        dividendSpread: 1.0,
        prefixes: ["Summit", "Vista", "OpenRoad", "Launch", "Avenue", "Beacon", "Velocity", "Modern"],
        suffixes: ["Retail", "Mobility", "Lifestyle", "Commerce", "Motors", "Brands", "Travel", "Experiences"]
    },
    Financials: {
        code: "F",
        peBase: 14,
        peSpread: 8,
        dividendBase: 2.2,
        dividendSpread: 2.4,
        prefixes: ["Harbor", "Summit", "Atlas", "Crown", "Crest", "North", "Pinnacle", "Beacon"],
        suffixes: ["Capital", "Bank", "Financial", "Advisors", "Holdings", "Trust", "Asset Group", "Partners"]
    },
    Energy: {
        code: "E",
        peBase: 13,
        peSpread: 7,
        dividendBase: 3.0,
        dividendSpread: 2.0,
        prefixes: ["Frontier", "Terra", "Granite", "Vector", "Canyon", "Iron", "Atlas", "Prairie"],
        suffixes: ["Energy", "Resources", "Drilling", "Logistics", "Power", "Fuel", "Pipeline", "Materials"]
    },
    Healthcare: {
        code: "H",
        peBase: 21,
        peSpread: 11,
        dividendBase: 1.4,
        dividendSpread: 1.3,
        prefixes: ["BluePeak", "Everwell", "NorthStar", "Vital", "Pulse", "CarePoint", "Summit", "BioCore"],
        suffixes: ["Health", "Biotech", "Therapeutics", "Care", "MedTech", "Sciences", "Diagnostics", "Life"]
    },
    "Consumer Staples": {
        code: "S",
        peBase: 20,
        peSpread: 8,
        dividendBase: 2.0,
        dividendSpread: 1.8,
        prefixes: ["Harvest", "Oak", "Market", "Daily", "Family", "Prime", "Atlas", "Tradition"],
        suffixes: ["Foods", "Staples", "Markets", "Brands", "Goods", "Distribution", "Supply", "Stores"]
    },
    Industrials: {
        code: "I",
        peBase: 19,
        peSpread: 9,
        dividendBase: 1.6,
        dividendSpread: 1.5,
        prefixes: ["Aero", "Summit", "Forge", "Titan", "Union", "Vector", "Precision", "Atlas"],
        suffixes: ["Industrial", "Logistics", "Machinery", "Dynamics", "Aviation", "Transit", "Engineering", "Fabrication"]
    },
    default: {
        code: "X",
        peBase: 18,
        peSpread: 10,
        dividendBase: 1.0,
        dividendSpread: 1.2,
        prefixes: ["Signal", "Atlas", "Modern", "Prime", "North", "Bridge", "Crest", "Summit"],
        suffixes: ["Group", "Holdings", "Works", "Industries", "Partners", "Global", "Labs", "Ventures"]
    }
};

const sectorColors = {
    Technology: "#0f6d4a",
    "Communication Services": "#7c3aed",
    "Consumer Discretionary": "#d97706",
    Financials: "#1d4ed8",
    Energy: "#b45309",
    Healthcare: "#0f766e",
    "Consumer Staples": "#b42318",
    Industrials: "#475569",
    default: "#64748b"
};

const metricLabels = {
    momentumScore: "Momentum",
    marketCap: "Market cap",
    qualityScore: "Quality",
    dividendYield: "Dividend",
    volatilityScore: "Volatility"
};

function round(value, decimals = 2) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
        return 0;
    }
    return Number(numericValue.toFixed(decimals));
}

function average(values) {
    if (!values.length) {
        return 0;
    }
    return values.reduce((total, value) => total + Number(value), 0) / values.length;
}

function sum(values) {
    return values.reduce((total, value) => total + Number(value), 0);
}

function seedFromString(value) {
    return Array.from(String(value)).reduce((hash, character) => {
        return ((hash * 31) + character.charCodeAt(0)) >>> 0;
    }, 7);
}

function pseudoRandom(...parts) {
    const seed = seedFromString(parts.join("|"));
    const raw = Math.sin(seed * 12.9898) * 43758.5453;
    return raw - Math.floor(raw);
}

function getSectorModel(sector) {
    return sectorModels[sector] || sectorModels.default;
}

function getSectorColor(sector) {
    return sectorColors[sector] || sectorColors.default;
}

function hexToRgba(hex, alpha) {
    const cleanHex = hex.replace("#", "");
    const expandedHex = cleanHex.length === 3
        ? cleanHex.split("").map((character) => `${character}${character}`).join("")
        : cleanHex;

    const red = parseInt(expandedHex.slice(0, 2), 16);
    const green = parseInt(expandedHex.slice(2, 4), 16);
    const blue = parseInt(expandedHex.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function toIsoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function buildTradingCalendar(days) {
    const dates = [];
    const cursor = new Date();
    cursor.setHours(12, 0, 0, 0);

    while (dates.length < days) {
        const dayOfWeek = cursor.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            dates.unshift(toIsoDate(cursor));
        }
        cursor.setDate(cursor.getDate() - 1);
    }

    return dates;
}

function getTradingCalendar() {
    if (!tradingCalendar) {
        tradingCalendar = buildTradingCalendar(HISTORY_POINTS);
    }
    return tradingCalendar;
}

function formatDateLabel(value) {
    if (typeof value !== "string" || !value.includes("-")) {
        return value;
    }

    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) {
        return value;
    }

    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
    });
}

function formatUpdatedAt(value) {
    if (!value) {
        return null;
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        return null;
    }

    return parsedDate.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}

function normalizeDateLabel(value, index = 0) {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
        parsed.setHours(12, 0, 0, 0);
        return toIsoDate(parsed);
    }

    return getTradingCalendar()[index] || getTradingCalendar().at(-1);
}

function movingAverage(values, index, window) {
    const start = Math.max(0, index - window + 1);
    const slice = values.slice(start, index + 1);
    return average(slice);
}

function rollingStdDev(values, index, window) {
    const start = Math.max(0, index - window + 1);
    const slice = values.slice(start, index + 1);
    if (!slice.length) {
        return 0;
    }

    const mean = average(slice);
    const variance = average(slice.map((value) => (value - mean) ** 2));
    return Math.sqrt(variance);
}

function scaleHistoryToCurrentPrice(history, currentPrice) {
    if (!history.length || !currentPrice) {
        return history;
    }

    const lastPrice = Number(history.at(-1).price);
    if (!lastPrice) {
        return history;
    }

    const scaleFactor = currentPrice / lastPrice;
    return history.map((point) => ({
        ...point,
        price: round(point.price * scaleFactor)
    }));
}

function computeScores(company, salt = 0) {
    const price = Number(company.currentPrice) || 0;
    const changePercentValue = Number(company.changePercent) || 0;
    const marketCapValue = Number(company.marketCap) || 0;
    const volumeValue = Number(company.volume) || 0;
    const peRatioValue = Number(company.peRatio) || 0;
    const dividendValue = Number(company.dividendYield) || 0;
    const model = getSectorModel(company.sector);

    const valuationScore = clamp(92 - (peRatioValue * 1.7) + (model.peBase * 0.25), 12, 96);
    const momentumScore = clamp(52 + (changePercentValue * 7.5) + (salt % 9) - (peRatioValue * 0.15), 10, 98);
    const volatilityScore = clamp(24 + (Math.abs(changePercentValue) * 16) + ((salt % 13) * 2.2) + Math.max(0, 18 - peRatioValue * 0.4), 16, 95);
    const qualityScore = clamp(34 + (Math.log10(marketCapValue + 1) * 8.5) + (Math.log10(volumeValue + 1) * 3.8) - (volatilityScore * 0.12), 18, 98);
    const liquidityScore = clamp(18 + (Math.log10(volumeValue + 1) * 11.2), 18, 98);
    const incomeScore = clamp(14 + (dividendValue * 15) + (model.dividendBase * 4), 8, 95);

    return {
        valuationScore: round(valuationScore, 1),
        momentumScore: round(momentumScore, 1),
        volatilityScore: round(volatilityScore, 1),
        qualityScore: round(qualityScore, 1),
        liquidityScore: round(liquidityScore, 1),
        incomeScore: round(incomeScore, 1),
        currentPrice: round(price),
        changePercent: round(changePercentValue),
        marketCap: Math.round(marketCapValue),
        volume: Math.round(volumeValue),
        peRatio: round(peRatioValue, 1),
        dividendYield: round(dividendValue, 2)
    };
}

function normalizeHistory(rawHistory, company, indexOffset = 0) {
    if (!Array.isArray(rawHistory) || rawHistory.length < 45) {
        return null;
    }

    const history = rawHistory
        .map((point, index) => ({
            label: normalizeDateLabel(point.label || point.date || point.tradingDate, index + indexOffset),
            price: round(point.price ?? point.closePrice ?? point.close),
            volume: Math.round(Number(point.volume ?? company.volume ?? 0))
        }))
        .filter((point) => point.price > 0)
        .sort((first, second) => first.label.localeCompare(second.label));

    if (history.length < 45) {
        return null;
    }

    return scaleHistoryToCurrentPrice(history.slice(-HISTORY_POINTS), company.currentPrice);
}

function decorateHistory(history) {
    const prices = history.map((point) => Number(point.price));
    const basePrice = prices[0] || 1;

    let benchmarkPrice = basePrice;
    let highWater = prices[0] || 1;

    return history.map((point, index) => {
        const price = Number(point.price);
        const previousPrice = prices[index - 1] || price;
        const dailyReturn = previousPrice ? ((price - previousPrice) / previousPrice) : 0;
        benchmarkPrice = index === 0
            ? price
            : benchmarkPrice * (1 + (dailyReturn * 0.45) + 0.0005);

        highWater = Math.max(highWater, price);

        const ma10 = movingAverage(prices, index, 10);
        const ma20 = movingAverage(prices, index, 20);
        const ma30 = movingAverage(prices, index, 30);
        const std20 = rollingStdDev(prices, index, 20);
        const normalizedReturn = ((price / basePrice) - 1) * 100;
        const benchmarkReturn = ((benchmarkPrice / basePrice) - 1) * 100;
        const relativeStrength = normalizedReturn - benchmarkReturn;
        const drawdown = ((price / highWater) - 1) * 100;
        const momentum = index >= 10
            ? ((price / prices[index - 10]) - 1) * 100
            : normalizedReturn;

        return {
            ...point,
            ma10: round(ma10),
            ma30: round(ma30),
            upperBand: round(ma20 + (std20 * 2)),
            lowerBand: round(Math.max(1, ma20 - (std20 * 2))),
            normalizedReturn: round(normalizedReturn),
            benchmarkReturn: round(benchmarkReturn),
            relativeStrength: round(relativeStrength),
            drawdown: round(drawdown),
            momentum: round(momentum)
        };
    });
}

function buildSeedCompany(stock, index) {
    const sector = stock.sector || "Unknown";
    const model = getSectorModel(sector);
    const salt = seedFromString(`${stock.symbol}|${index}`);
    const derivedPe = round(model.peBase + ((index % 5) - 2) * 1.6 + (Number(stock.changePercent) || 0) * 0.7, 1);
    const derivedDividend = round(Math.max(0, model.dividendBase + ((index % 4) - 1.5) * 0.28), 2);

    const company = {
        symbol: stock.symbol,
        companyName: stock.companyName,
        sector,
        exchange: index % 2 === 0 ? "NASDAQ" : "NYSE",
        currentPrice: Number(stock.currentPrice),
        changePercent: Number(stock.changePercent),
        volume: Number(stock.volume),
        marketCap: Number(stock.marketCap),
        peRatio: derivedPe,
        dividendYield: derivedDividend,
        dataSourceLabel: "Seed training dataset",
        updatedAt: null,
        liveEligible: true,
        isOfflineSeed: true
    };

    return {
        ...company,
        ...computeScores(company, salt)
    };
}

function buildSyntheticSymbol(template, model, index) {
    const prefix = `${template.symbol}`.replace(/[^A-Z]/gi, "").toUpperCase().slice(0, 2).padEnd(2, "X");
    const serial = String(index.toString(36).toUpperCase()).padStart(3, "0");
    return `${prefix}${model.code}${serial}`.slice(0, 6);
}

function buildSyntheticCompanyName(template, model, index) {
    const prefix = model.prefixes[index % model.prefixes.length];
    const suffix = model.suffixes[(index + 3) % model.suffixes.length];
    const serial = String((index % 97) + 1).padStart(2, "0");
    return `${prefix} ${suffix} ${serial}`;
}

function buildSyntheticCompany(template, index) {
    const sector = template.sector || "Unknown";
    const model = getSectorModel(sector);
    const priceMultiplier = 0.45 + (pseudoRandom(template.symbol, index, "price") * 2.6);
    const marketCapMultiplier = 0.2 + (pseudoRandom(template.symbol, index, "cap") * 1.8);
    const volumeMultiplier = 0.35 + (pseudoRandom(template.symbol, index, "volume") * 1.9);
    const momentumBias = (pseudoRandom(template.symbol, index, "momentum") - 0.5) * 5.4;
    const dividendBias = (pseudoRandom(template.symbol, index, "dividend") - 0.5) * model.dividendSpread;
    const peBias = (pseudoRandom(template.symbol, index, "pe") - 0.5) * model.peSpread;

    const company = {
        symbol: buildSyntheticSymbol(template, model, index),
        companyName: buildSyntheticCompanyName(template, model, index),
        sector,
        exchange: pseudoRandom(template.symbol, index, "exchange") > 0.45 ? "NASDAQ" : "NYSE",
        currentPrice: round(template.currentPrice * priceMultiplier),
        changePercent: round((template.changePercent * 0.35) + momentumBias),
        volume: Math.round(template.volume * volumeMultiplier),
        marketCap: Math.round(template.marketCap * marketCapMultiplier),
        peRatio: round(Math.max(6, model.peBase + peBias), 1),
        dividendYield: round(Math.max(0, model.dividendBase + dividendBias), 2),
        dataSourceLabel: "Offline simulation dataset",
        updatedAt: null,
        liveEligible: false,
        isOfflineSeed: true
    };

    return {
        ...company,
        ...computeScores(company, index)
    };
}

function buildSyntheticHistory(company) {
    const dates = getTradingCalendar();
    const seed = seedFromString(company.symbol);
    const momentumDrift = ((company.momentumScore - 50) / 100) * 0.0018;
    const volatilityBand = (company.volatilityScore / 100) * 0.01;
    let price = Math.max(8, company.currentPrice / (1 + ((company.changePercent / 100) * 1.8)));

    const history = dates.map((dateLabel, index) => {
        const cycle = Math.sin((index + (seed % 17)) / 4.4) * volatilityBand * 0.7;
        const secondaryCycle = Math.cos((index + (seed % 29)) / 9.2) * volatilityBand * 0.45;
        const noise = (pseudoRandom(company.symbol, index, "history") - 0.5) * volatilityBand * 0.9;
        const dailyReturn = momentumDrift + cycle + secondaryCycle + noise;
        price = Math.max(6, price * (1 + dailyReturn));

        const volumeSwing = 0.72 + Math.abs(cycle * 25) + (pseudoRandom(company.symbol, index, "volume-history") * 0.35);
        const pointVolume = Math.round(company.volume * volumeSwing);

        return {
            label: dateLabel,
            price: round(price),
            volume: pointVolume
        };
    });

    return scaleHistoryToCurrentPrice(history, company.currentPrice);
}

function normalizeCompany(rawCompany, rawHistory, index) {
    const sector = rawCompany.sector || "Unknown";
    const company = {
        symbol: String(rawCompany.symbol || `SIM${index}`),
        companyName: rawCompany.companyName || rawCompany.name || `Training Company ${index + 1}`,
        sector,
        exchange: rawCompany.exchange || "NYSE",
        currentPrice: Number(rawCompany.currentPrice ?? rawCompany.price ?? 0),
        changePercent: Number(rawCompany.changePercent ?? rawCompany.change ?? 0),
        volume: Number(rawCompany.volume ?? 0),
        marketCap: Number(rawCompany.marketCap ?? 0),
        peRatio: Number(rawCompany.peRatio ?? rawCompany.trailingPe ?? getSectorModel(sector).peBase),
        dividendYield: Number(rawCompany.dividendYield ?? 0),
        dataSourceLabel: rawCompany.source || rawCompany.dataSourceLabel || "Arena dataset",
        updatedAt: rawCompany.updatedAt || rawCompany.generatedAt || null,
        liveEligible: rawCompany.liveEligible ?? true,
        history: null
    };

    const normalized = {
        ...company,
        ...computeScores(
            {
                ...company,
                valuationScore: rawCompany.valuationScore,
                momentumScore: rawCompany.momentumScore,
                volatilityScore: rawCompany.volatilityScore,
                qualityScore: rawCompany.qualityScore,
                liquidityScore: rawCompany.liquidityScore,
                incomeScore: rawCompany.incomeScore
            },
            index
        )
    };

    normalized.valuationScore = round(rawCompany.valuationScore ?? normalized.valuationScore, 1);
    normalized.momentumScore = round(rawCompany.momentumScore ?? normalized.momentumScore, 1);
    normalized.volatilityScore = round(rawCompany.volatilityScore ?? normalized.volatilityScore, 1);
    normalized.qualityScore = round(rawCompany.qualityScore ?? normalized.qualityScore, 1);
    normalized.liquidityScore = round(rawCompany.liquidityScore ?? normalized.liquidityScore, 1);
    normalized.incomeScore = round(rawCompany.incomeScore ?? normalized.incomeScore, 1);
    normalized.history = normalizeHistory(rawHistory || rawCompany.history, normalized, index);

    return normalized;
}

function normalizeDataset(dataset) {
    const rawCompanies = Array.isArray(dataset) ? dataset : dataset.companies || [];
    const histories = Array.isArray(dataset) ? {} : dataset.histories || {};

    const companies = rawCompanies
        .slice(0, TARGET_UNIVERSE_SIZE)
        .map((company, index) => normalizeCompany(
            { ...company, source: company.source || dataset.source },
            histories[company.symbol] || histories[String(company.symbol).toUpperCase()],
            index
        ))
        .filter((company) => company.currentPrice > 0);

    return {
        source: dataset.source || "Custom dataset",
        companies: companies.sort((first, second) => second.marketCap - first.marketCap)
    };
}

function buildOfflineUniverse(stocks) {
    const baseUniverse = stocks.map((stock, index) => buildSeedCompany(stock, index));
    const companyMap = new Map(baseUniverse.map((company) => [company.symbol, company]));

    for (let index = baseUniverse.length; index < TARGET_UNIVERSE_SIZE; index++) {
        const template = baseUniverse[index % baseUniverse.length];
        const syntheticCompany = buildSyntheticCompany(template, index);
        if (!companyMap.has(syntheticCompany.symbol)) {
            companyMap.set(syntheticCompany.symbol, syntheticCompany);
        }
    }

    return {
        source: "Offline simulation dataset",
        companies: Array.from(companyMap.values()).sort((first, second) => second.marketCap - first.marketCap).slice(0, TARGET_UNIVERSE_SIZE)
    };
}

async function loadTrainingUniverse() {
    try {
        const dataset = await fetchOptionalJson("data/training-universe.json");
        if (dataset?.companies?.length) {
            return normalizeDataset(dataset);
        }
    } catch (error) {
        console.warn("Could not load training-universe.json, using offline fallback.", error);
    }

    const stocks = await fetchJson(API_BASE);
    return buildOfflineUniverse(stocks);
}

function renderLessons(lessons) {
    lessonList.innerHTML = lessons.map((lesson) => `
        <article class="lesson-card">
            <div class="lesson-top">
                <strong>${lesson.title}</strong>
                <span class="badge">${lesson.difficulty}</span>
            </div>
            <p>${lesson.summary}</p>
            <div class="chip-row lesson-chip-row">
                ${lesson.concepts.map((concept) => `<span class="mini-chip">${concept}</span>`).join("")}
            </div>
            <p><strong>Challenge:</strong> ${lesson.challengeQuestion}</p>
            <p class="warning"><strong>Risk hint:</strong> ${lesson.riskHint}</p>
        </article>
    `).join("");
}

function renderHeroMetrics(companies) {
    const advancers = companies.filter((company) => company.changePercent >= 0).length;
    const averagePe = average(companies.map((company) => company.peRatio));
    const sectorCounts = companies.reduce((counts, company) => {
        counts[company.sector] = (counts[company.sector] || 0) + 1;
        return counts;
    }, {});

    const topSectorEntry = Object.entries(sectorCounts).sort((first, second) => second[1] - first[1])[0];

    arenaCompanyCount.textContent = number(companies.length);
    arenaAdvancers.textContent = number(advancers);
    arenaAveragePe.textContent = round(averagePe, 1).toFixed(1);
    arenaTopSector.textContent = topSectorEntry ? topSectorEntry[0] : "-";
    arenaDataSource.textContent = trainingSourceLabel;
}

function renderSectorFilter(companies) {
    const currentValue = sectorFilter.value || "all";
    const sectors = Array.from(new Set(companies.map((company) => company.sector))).sort();
    sectorFilter.innerHTML = [
        `<option value="all">All sectors</option>`,
        ...sectors.map((sector) => `<option value="${sector}">${sector}</option>`)
    ].join("");

    sectorFilter.value = sectors.includes(currentValue) || currentValue === "all" ? currentValue : "all";
}

function renderCompanySelect(companies) {
    const currentValue = companySelect.value || selectedSymbol;
    const groupedCompanies = companies.reduce((groups, company) => {
        const group = groups.get(company.sector) || [];
        group.push(company);
        groups.set(company.sector, group);
        return groups;
    }, new Map());

    const sortedSectors = Array.from(groupedCompanies.keys()).sort();
    companySelect.innerHTML = sortedSectors.map((sector) => {
        const options = groupedCompanies.get(sector)
            .sort((first, second) => first.companyName.localeCompare(second.companyName))
            .map((company) => `<option value="${company.symbol}">${company.symbol} - ${company.companyName}</option>`)
            .join("");

        return `<optgroup label="${sector}">${options}</optgroup>`;
    }).join("");

    if (currentValue && companies.some((company) => company.symbol === currentValue)) {
        companySelect.value = currentValue;
    }
}

function getFilteredCompanies() {
    const sectorValue = sectorFilter.value || "all";
    const filtered = sectorValue === "all"
        ? [...companyUniverse]
        : companyUniverse.filter((company) => company.sector === sectorValue);

    return filtered.sort((first, second) => Number(second[rankingMetric.value]) - Number(first[rankingMetric.value]));
}

function formatMetricValue(metric, company) {
    switch (metric) {
        case "marketCap":
            return compactCurrency(company.marketCap);
        case "dividendYield":
            return percent(company.dividendYield);
        case "volatilityScore":
        case "momentumScore":
        case "qualityScore":
            return `${Math.round(company[metric])} pts`;
        default:
            return `${round(company[metric] || 0, 1)} pts`;
    }
}

function renderLeaderboard(companies) {
    const metric = rankingMetric.value;
    const topCompanies = companies.slice(0, 10);

    universeLeaderboard.innerHTML = topCompanies.map((company, index) => `
        <button class="leaderboard-item ${company.symbol === selectedSymbol ? "selected" : ""}" data-symbol="${company.symbol}">
            <div>
                <span class="leaderboard-rank">#${index + 1}</span>
                <strong>${company.symbol}</strong>
                <p>${company.companyName}</p>
            </div>
            <div class="leaderboard-value">
                <strong>${formatMetricValue(metric, company)}</strong>
                <span>${metricLabels[metric]}</span>
            </div>
        </button>
    `).join("");
}

function renderUniverseChart(companies) {
    const selectedCompany = getCompanyBySymbol(selectedSymbol);
    const grouped = companies.reduce((datasets, company) => {
        const sector = company.sector;
        if (!datasets[sector]) {
            datasets[sector] = [];
        }

        datasets[sector].push({
            x: Math.max(4, company.peRatio),
            y: company.changePercent,
            r: clamp(Math.sqrt(company.marketCap) / 90000, 5, 22),
            company
        });
        return datasets;
    }, {});

    const datasets = Object.entries(grouped).map(([sector, points]) => {
        const color = getSectorColor(sector);
        return {
            label: sector,
            data: points,
            backgroundColor: hexToRgba(color, 0.28),
            borderColor: color,
            borderWidth: 1.2,
            hoverBorderWidth: 2
        };
    });

    if (selectedCompany && companies.some((company) => company.symbol === selectedCompany.symbol)) {
        datasets.push({
            label: "Selected",
            data: [{
                x: Math.max(4, selectedCompany.peRatio),
                y: selectedCompany.changePercent,
                r: clamp(Math.sqrt(selectedCompany.marketCap) / 85000, 8, 24),
                company: selectedCompany
            }],
            backgroundColor: "rgba(23, 32, 42, 0.1)",
            borderColor: "#17202a",
            borderWidth: 2.5
        });
    }

    if (universeChart) {
        universeChart.destroy();
    }

    universeChart = new Chart(document.getElementById("universeChart"), {
        type: "bubble",
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "nearest",
                intersect: false
            },
            plugins: {
                legend: {
                    position: "bottom"
                },
                tooltip: {
                    callbacks: {
                        label(context) {
                            const company = context.raw.company;
                            return [
                                `${company.symbol} - ${company.companyName}`,
                                `PE ${round(company.peRatio, 1)} | Change ${signedPercent(company.changePercent)}`,
                                `Market cap ${compactCurrency(company.marketCap)} | Volume ${number(company.volume)}`
                            ];
                        }
                    }
                },
                zoom: zoomOptions()
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Valuation (P/E ratio)"
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: "1-day change %"
                    }
                }
            },
            onClick(event, elements) {
                if (!elements.length) {
                    return;
                }

                const { datasetIndex, index } = elements[0];
                const company = universeChart.data.datasets[datasetIndex].data[index].company;
                selectCompany(company.symbol).catch(console.error);
            }
        }
    });
}

function getCompanyBySymbol(symbol) {
    return companyUniverse.find((company) => company.symbol === symbol);
}

function upsertCompanyInUniverse(company) {
    const existingIndex = companyUniverse.findIndex((item) => item.symbol === company.symbol);
    const mergedCompany = {
        ...(existingIndex >= 0 ? companyUniverse[existingIndex] : {}),
        ...company,
        history: company.history,
        decoratedHistory: null
    };

    if (existingIndex >= 0) {
        companyUniverse.splice(existingIndex, 1, mergedCompany);
    } else {
        companyUniverse.push(mergedCompany);
    }

    renderHeroMetrics(companyUniverse);
    renderSectorFilter(companyUniverse);
    renderCompanySelect(companyUniverse);
    return mergedCompany;
}

function ensureCompanyHistory(company) {
    if (!company.history) {
        company.history = buildSyntheticHistory(company);
    }
    if (!company.decoratedHistory) {
        company.decoratedHistory = decorateHistory(company.history);
    }
    return company.decoratedHistory;
}

function buildPositionSizing(company) {
    const totalValue = getPortfolioSnapshot().totalValue;
    const stopBufferPercent = clamp((company.volatilityScore / 22), 2.5, 8.5);
    const riskBudget = totalValue * 0.02;
    const riskPerShare = company.currentPrice * (stopBufferPercent / 100);
    const maxAffordableShares = Math.floor(portfolio.cash / company.currentPrice);
    const suggestedShares = Math.max(1, Math.min(maxAffordableShares || 1, Math.floor(riskBudget / Math.max(riskPerShare, 0.01))));

    return {
        riskBudget,
        stopBufferPercent,
        suggestedShares
    };
}

function buildCompanyNarrative(company, history) {
    const latest = history.at(-1);
    const valuationView = company.peRatio < 16
        ? "valuation is sitting on the cheaper side of the arena"
        : company.peRatio > 30
            ? "valuation is rich, so execution has to stay strong"
            : "valuation is in a middle range where trend and earnings matter equally";
    const momentumView = latest.relativeStrength >= 0
        ? "relative strength is ahead of the smoother benchmark path"
        : "relative strength is lagging, so patience matters more than urgency";
    const riskView = company.volatilityScore > 68
        ? "This is a faster-moving setup, which makes smaller size and clearer exits especially important."
        : "Price swings are moderate enough to teach structure without turning every move into chaos.";

    return `${company.companyName} is a useful teaching case because ${valuationView}, ${momentumView}, and ${riskView}`;
}

function buildSupportResistance(history) {
    const recent = history.slice(-20);
    const prices = recent.map((point) => point.price);
    return {
        support: Math.min(...prices),
        resistance: Math.max(...prices)
    };
}

function renderCompanyBriefing(company, history) {
    const latest = history.at(-1);
    const supportResistance = buildSupportResistance(history);
    const riskControlScore = round(100 - company.volatilityScore, 1);

    companyBriefing.innerHTML = `
        <div class="briefing-header">
            <div>
                <p class="eyebrow">Focus name</p>
                <h3>${company.companyName}</h3>
                <p class="subtitle">${company.symbol} | ${company.sector} | ${company.exchange}</p>
            </div>
            <div class="briefing-price">
                <strong>${currency(company.currentPrice)}</strong>
                <span class="${changeClass(company.changePercent)}">${signedPercent(company.changePercent)}</span>
            </div>
        </div>

        <div class="chip-row briefing-chip-row">
            <span class="signal-chip">Momentum ${Math.round(company.momentumScore)}</span>
            <span class="signal-chip">Quality ${Math.round(company.qualityScore)}</span>
            <span class="signal-chip">Risk control ${Math.round(riskControlScore)}</span>
        </div>

        <div class="briefing-grid">
            <article class="briefing-stat">
                <span>PE Ratio</span>
                <strong>${round(company.peRatio, 1)}</strong>
                <p>Use this to frame expectation risk.</p>
            </article>
            <article class="briefing-stat">
                <span>Dividend Yield</span>
                <strong>${percent(company.dividendYield)}</strong>
                <p>Great for income versus growth discussions.</p>
            </article>
            <article class="briefing-stat">
                <span>Relative Strength</span>
                <strong class="${changeClass(latest.relativeStrength)}">${signedPercent(latest.relativeStrength)}</strong>
                <p>How the stock is acting against a smoother benchmark.</p>
            </article>
            <article class="briefing-stat">
                <span>Drawdown</span>
                <strong class="${changeClass(latest.drawdown)}">${signedPercent(latest.drawdown)}</strong>
                <p>Shows how far price is from its recent high-water mark.</p>
            </article>
            <article class="briefing-stat">
                <span>Support</span>
                <strong>${currency(supportResistance.support)}</strong>
                <p>Recent floor where buyers showed up.</p>
            </article>
            <article class="briefing-stat">
                <span>Resistance</span>
                <strong>${currency(supportResistance.resistance)}</strong>
                <p>Recent zone where price met supply.</p>
            </article>
        </div>

        <p class="teaching-note">${buildCompanyNarrative(company, history)}</p>
    `;
}

function renderScoreChart(company) {
    if (companyScoreChart) {
        companyScoreChart.destroy();
    }

    companyScoreChart = new Chart(document.getElementById("companyScoreChart"), {
        type: "radar",
        data: {
            labels: ["Valuation", "Quality", "Momentum", "Income", "Liquidity", "Risk Control"],
            datasets: [{
                label: company.symbol,
                data: [
                    company.valuationScore,
                    company.qualityScore,
                    company.momentumScore,
                    company.incomeScore,
                    company.liquidityScore,
                    round(100 - company.volatilityScore, 1)
                ],
                borderColor: "#0f6d4a",
                backgroundColor: "rgba(15, 109, 74, 0.16)",
                pointBackgroundColor: "#0f6d4a"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    min: 0,
                    max: 100,
                    ticks: {
                        backdropColor: "transparent"
                    },
                    pointLabels: {
                        font: {
                            size: 11
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function renderPriceChart(company, history) {
    if (companyPriceChart) {
        companyPriceChart.destroy();
    }

    companyPriceChart = new Chart(document.getElementById("companyPriceChart"), {
        data: {
            labels: history.map((point) => formatDateLabel(point.label)),
            datasets: [
                {
                    type: "bar",
                    label: "Volume",
                    data: history.map((point) => point.volume),
                    backgroundColor: "rgba(29, 78, 216, 0.18)",
                    borderRadius: 6,
                    yAxisID: "y1"
                },
                {
                    type: "line",
                    label: `${company.symbol} Price`,
                    data: history.map((point) => point.price),
                    borderColor: "#0f6d4a",
                    backgroundColor: "rgba(15, 109, 74, 0.12)",
                    fill: true,
                    tension: 0.26,
                    pointRadius: 0,
                    yAxisID: "y"
                },
                {
                    type: "line",
                    label: "10-day average",
                    data: history.map((point) => point.ma10),
                    borderColor: "#d97706",
                    borderDash: [8, 5],
                    tension: 0.2,
                    pointRadius: 0,
                    yAxisID: "y"
                },
                {
                    type: "line",
                    label: "30-day average",
                    data: history.map((point) => point.ma30),
                    borderColor: "#7c3aed",
                    tension: 0.2,
                    pointRadius: 0,
                    yAxisID: "y"
                },
                {
                    type: "line",
                    label: "Upper band",
                    data: history.map((point) => point.upperBand),
                    borderColor: "rgba(180, 35, 24, 0.55)",
                    borderDash: [4, 6],
                    pointRadius: 0,
                    tension: 0.2,
                    yAxisID: "y"
                },
                {
                    type: "line",
                    label: "Lower band",
                    data: history.map((point) => point.lowerBand),
                    borderColor: "rgba(180, 35, 24, 0.55)",
                    borderDash: [4, 6],
                    pointRadius: 0,
                    tension: 0.2,
                    yAxisID: "y"
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "index",
                intersect: false
            },
            plugins: {
                zoom: zoomOptions()
            },
            scales: {
                y: {
                    position: "left",
                    title: {
                        display: true,
                        text: "Price"
                    }
                },
                y1: {
                    position: "right",
                    grid: {
                        drawOnChartArea: false
                    },
                    title: {
                        display: true,
                        text: "Volume"
                    }
                }
            }
        }
    });
}

function renderSignalChart(company, history) {
    if (companySignalChart) {
        companySignalChart.destroy();
    }

    companySignalChart = new Chart(document.getElementById("companySignalChart"), {
        data: {
            labels: history.map((point) => formatDateLabel(point.label)),
            datasets: [
                {
                    type: "line",
                    label: `${company.symbol} Return`,
                    data: history.map((point) => point.normalizedReturn),
                    borderColor: "#1d4ed8",
                    backgroundColor: "rgba(29, 78, 216, 0.08)",
                    fill: true,
                    tension: 0.25,
                    pointRadius: 0,
                    yAxisID: "y"
                },
                {
                    type: "line",
                    label: "Benchmark Return",
                    data: history.map((point) => point.benchmarkReturn),
                    borderColor: "#d97706",
                    borderDash: [9, 5],
                    tension: 0.25,
                    pointRadius: 0,
                    yAxisID: "y"
                },
                {
                    type: "line",
                    label: "Relative Strength",
                    data: history.map((point) => point.relativeStrength),
                    borderColor: "#0f766e",
                    tension: 0.25,
                    pointRadius: 0,
                    yAxisID: "y"
                },
                {
                    type: "bar",
                    label: "Drawdown",
                    data: history.map((point) => point.drawdown),
                    backgroundColor: "rgba(180, 35, 24, 0.18)",
                    borderColor: "rgba(180, 35, 24, 0.75)",
                    yAxisID: "y1"
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "index",
                intersect: false
            },
            plugins: {
                zoom: zoomOptions()
            },
            scales: {
                y: {
                    position: "left",
                    title: {
                        display: true,
                        text: "Return %"
                    }
                },
                y1: {
                    position: "right",
                    grid: {
                        drawOnChartArea: false
                    },
                    title: {
                        display: true,
                        text: "Drawdown %"
                    }
                }
            }
        }
    });
}

function renderTeachingPrompts(company, history) {
    const latest = history.at(-1);
    const sizing = buildPositionSizing(company);
    const trendDescriptor = latest.momentum >= 0 ? "continuing higher" : "rolling over";
    const refreshedAt = formatUpdatedAt(company.updatedAt);
    const sourceSummary = refreshedAt
        ? `${company.dataSourceLabel} refreshed ${refreshedAt}.`
        : `${company.dataSourceLabel}.`;

    selectedTeachingPrompt.textContent = `Ask students whether ${company.symbol} deserves a buy thesis right now: valuation is ${company.peRatio < 18 ? "compressed" : company.peRatio > 30 ? "rich" : "balanced"}, while trend is ${trendDescriptor}. What evidence would change their mind?`;
    selectedRiskPrompt.textContent = `Risk prompt: if ${company.symbol} is down ${Math.abs(latest.drawdown).toFixed(1)}% from its recent high and volatility scores ${Math.round(company.volatilityScore)}, where would a disciplined stop go and what would invalidate the thesis?`;
    selectedSizingPrompt.textContent = `Sizing prompt: with a 2% account risk budget, a stop roughly ${sizing.stopBufferPercent.toFixed(1)}% away suggests up to ${number(sizing.suggestedShares)} shares in this simulator.`;
    selectedDatasetPrompt.textContent = company.liveEligible === false
        ? `${sourceSummary} This dropdown entry is part of the offline practice universe, so no live Yahoo refresh is attempted for it.`
        : `${sourceSummary} Selecting a company from the dropdown tries a live Yahoo refresh before falling back to the arena dataset.`;
}

function setFeedback(message, tone = "muted") {
    simulationFeedback.textContent = message;
    simulationFeedback.className = `feedback-banner ${tone}`;
}

function getPortfolioSnapshot() {
    const holdings = Object.entries(portfolio.positions).map(([symbol, position]) => {
        const company = getCompanyBySymbol(symbol);
        const currentPrice = company?.currentPrice || position.lastPrice || 0;
        const marketValue = currentPrice * position.shares;
        const averageCost = position.shares ? (position.totalCost / position.shares) : 0;
        const unrealizedPnl = marketValue - position.totalCost;

        return {
            symbol,
            companyName: company?.companyName || symbol,
            shares: position.shares,
            averageCost,
            currentPrice,
            marketValue,
            unrealizedPnl
        };
    }).sort((first, second) => second.marketValue - first.marketValue);

    const invested = sum(holdings.map((holding) => holding.marketValue));
    const unrealized = sum(holdings.map((holding) => holding.unrealizedPnl));
    const realized = sum(portfolio.trades.filter((trade) => trade.type === "SELL").map((trade) => trade.realizedPnl || 0));
    const totalValue = portfolio.cash + invested;
    const exposure = totalValue ? (invested / totalValue) * 100 : 0;
    const closedTrades = portfolio.trades.filter((trade) => trade.type === "SELL");
    const winRate = closedTrades.length
        ? (closedTrades.filter((trade) => Number(trade.realizedPnl) > 0).length / closedTrades.length) * 100
        : 0;

    return {
        holdings,
        invested,
        unrealized,
        realized,
        totalValue,
        exposure,
        winRate
    };
}

function renderPortfolio() {
    const snapshot = getPortfolioSnapshot();
    const holdingsMarkup = snapshot.holdings.length
        ? snapshot.holdings.map((holding) => `
            <article class="holding-item">
                <div>
                    <strong>${holding.symbol}</strong>
                    <p>${holding.companyName}</p>
                    <span>${number(holding.shares)} shares at ${currency(holding.averageCost)}</span>
                </div>
                <div class="list-item-right">
                    <strong>${currency(holding.marketValue)}</strong>
                    <span class="${changeClass(holding.unrealizedPnl)}">${currency(holding.unrealizedPnl)}</span>
                </div>
            </article>
        `).join("")
        : `<p class="empty-state">No open positions yet. Use the simulator to open your first practice trade.</p>`;

    const tradeMarkup = portfolio.trades.length
        ? portfolio.trades.slice().reverse().slice(0, 8).map((trade) => `
            <article class="trade-item">
                <div>
                    <strong>${trade.type} ${trade.symbol}</strong>
                    <p>${number(trade.shares)} shares at ${currency(trade.price)}</p>
                    <span>${new Date(trade.timestamp).toLocaleString()}</span>
                </div>
                <div class="list-item-right">
                    <strong>${currency(trade.notional)}</strong>
                    <span class="${changeClass(trade.realizedPnl || 0)}">${trade.type === "SELL" ? currency(trade.realizedPnl || 0) : "Open"}</span>
                </div>
                <p class="trade-thesis">${trade.thesis}</p>
            </article>
        `).join("")
        : `<p class="empty-state">Trades will appear here with their thesis so students can review process quality later.</p>`;

    holdingsList.innerHTML = holdingsMarkup;
    tradeLog.innerHTML = tradeMarkup;

    portfolioCash.textContent = currency(portfolio.cash);
    portfolioInvested.textContent = currency(snapshot.invested);
    portfolioUnrealized.textContent = currency(snapshot.unrealized);
    portfolioRealized.textContent = currency(snapshot.realized);
    portfolioExposure.textContent = percent(snapshot.exposure);
    portfolioWinRate.textContent = percent(snapshot.winRate);

    portfolioUnrealized.className = changeClass(snapshot.unrealized);
    portfolioRealized.className = changeClass(snapshot.realized);
}

function savePortfolio() {
    localStorage.setItem(TRAINING_STORAGE_KEY, JSON.stringify(portfolio));
}

function loadPortfolio() {
    try {
        const savedPortfolio = JSON.parse(localStorage.getItem(TRAINING_STORAGE_KEY));
        if (!savedPortfolio) {
            return {
                cash: STARTER_CASH,
                positions: {},
                trades: []
            };
        }

        return {
            cash: Number(savedPortfolio.cash ?? STARTER_CASH),
            positions: savedPortfolio.positions || {},
            trades: Array.isArray(savedPortfolio.trades) ? savedPortfolio.trades : []
        };
    } catch (error) {
        console.warn("Could not restore saved portfolio state.", error);
        return {
            cash: STARTER_CASH,
            positions: {},
            trades: []
        };
    }
}

function resetPortfolio() {
    portfolio = {
        cash: STARTER_CASH,
        positions: {},
        trades: []
    };
    savePortfolio();
    renderPortfolio();
    setFeedback("Portfolio reset to a fresh $100,000 paper account.", "muted");
}

function executeTrade(type) {
    const company = getCompanyBySymbol(selectedSymbol);
    const shares = Math.floor(Number(quantityInput.value));

    if (!company) {
        setFeedback("Pick a company before trying to trade.", "negative");
        return;
    }

    if (!Number.isFinite(shares) || shares < 1) {
        setFeedback("Trade size needs to be at least 1 share.", "negative");
        return;
    }

    const thesis = thesisInput.value.trim() || `Training thesis for ${company.symbol}: explain the setup, the risk, and the exit plan.`;
    const notional = round(company.currentPrice * shares);
    const position = portfolio.positions[company.symbol] || {
        shares: 0,
        totalCost: 0,
        lastPrice: company.currentPrice
    };

    if (type === "BUY") {
        if (notional > portfolio.cash) {
            setFeedback(`Not enough cash for ${number(shares)} shares of ${company.symbol}. Lower the size or sell another holding first.`, "negative");
            return;
        }

        position.shares += shares;
        position.totalCost += notional;
        position.lastPrice = company.currentPrice;
        portfolio.positions[company.symbol] = position;
        portfolio.cash = round(portfolio.cash - notional);
        portfolio.trades.push({
            type,
            symbol: company.symbol,
            shares,
            price: company.currentPrice,
            notional,
            thesis,
            timestamp: new Date().toISOString(),
            realizedPnl: 0
        });

        setFeedback(`Bought ${number(shares)} simulated shares of ${company.symbol} for ${currency(notional)}. Nice setup to discuss conviction versus size.`, "positive");
    } else {
        if (!portfolio.positions[company.symbol] || position.shares < shares) {
            setFeedback(`You only have ${number(position.shares || 0)} shares of ${company.symbol} available to sell.`, "negative");
            return;
        }

        const averageCost = position.totalCost / position.shares;
        const realizedPnl = round((company.currentPrice - averageCost) * shares);
        position.shares -= shares;
        position.totalCost = round(position.totalCost - (averageCost * shares));
        position.lastPrice = company.currentPrice;

        if (position.shares <= 0) {
            delete portfolio.positions[company.symbol];
        } else {
            portfolio.positions[company.symbol] = position;
        }

        portfolio.cash = round(portfolio.cash + notional);
        portfolio.trades.push({
            type,
            symbol: company.symbol,
            shares,
            price: company.currentPrice,
            notional,
            thesis,
            timestamp: new Date().toISOString(),
            realizedPnl
        });

        setFeedback(`Sold ${number(shares)} simulated shares of ${company.symbol}. Realized result: ${currency(realizedPnl)}. That makes a great journal review moment.`, realizedPnl >= 0 ? "positive" : "negative");
    }

    savePortfolio();
    renderPortfolio();
}

function applyRiskSizing() {
    const company = getCompanyBySymbol(selectedSymbol);
    if (!company) {
        setFeedback("Select a company first so I can calculate a position size.", "negative");
        return;
    }

    const sizing = buildPositionSizing(company);
    quantityInput.value = Math.max(1, sizing.suggestedShares);
    setFeedback(`A 2% risk budget with a ${sizing.stopBufferPercent.toFixed(1)}% stop suggests about ${number(sizing.suggestedShares)} shares of ${company.symbol}.`, "muted");
}

function updateSelectedCompany(symbol) {
    const company = getCompanyBySymbol(symbol);
    if (!company) {
        return;
    }

    selectedSymbol = company.symbol;
    companySelect.value = company.symbol;

    const history = ensureCompanyHistory(company);
    renderUniverseChart(getFilteredCompanies());
    renderLeaderboard(getFilteredCompanies());
    renderCompanyBriefing(company, history);
    renderScoreChart(company);
    renderPriceChart(company, history);
    renderSignalChart(company, history);
    renderTeachingPrompts(company, history);
    renderPortfolio();
}

async function fetchLiveCompany(symbol) {
    return fetchJson(`${TRAINING_API}/live-company?symbol=${encodeURIComponent(symbol)}`);
}

async function selectCompany(symbol) {
    updateSelectedCompany(symbol);
    const company = getCompanyBySymbol(symbol);
    if (!company) {
        return;
    }

    if (company.liveEligible === false) {
        setFeedback(`${symbol} is a simulated practice entry, so the page is using the local arena dataset for this selection.`, "muted");
        return;
    }

    const requestId = ++liveSelectionRequestId;
    setFeedback(`Fetching live Yahoo Finance data for ${symbol}...`, "muted");

    try {
        const liveCompany = await fetchLiveCompany(symbol);
        if (requestId !== liveSelectionRequestId || selectedSymbol !== symbol) {
            return;
        }

        const universeIndex = companyUniverse.findIndex((item) => item.symbol === String(liveCompany.symbol).toUpperCase());
        const normalizedCompany = normalizeCompany(
            liveCompany,
            liveCompany.history,
            universeIndex >= 0 ? universeIndex : companyUniverse.length
        );
        const mergedCompany = upsertCompanyInUniverse(normalizedCompany);
        updateSelectedCompany(mergedCompany.symbol);

        const refreshedAt = formatUpdatedAt(mergedCompany.updatedAt);
        setFeedback(
            `Live Yahoo Finance data loaded for ${mergedCompany.symbol}${refreshedAt ? ` at ${refreshedAt}` : ""}.`,
            "positive"
        );
    } catch (error) {
        if (requestId !== liveSelectionRequestId || selectedSymbol !== symbol) {
            return;
        }

        console.error(error);
        setFeedback(`Using the current arena data for ${symbol}. Live Yahoo refresh was unavailable for this selection.`, "muted");
        updateSelectedCompany(symbol);
    }
}

function initializeLeaderboardEvents() {
    universeLeaderboard.addEventListener("click", (event) => {
        const button = event.target.closest("[data-symbol]");
        if (!button) {
            return;
        }

        selectCompany(button.dataset.symbol).catch(console.error);
    });
}

function refreshUniverseViews() {
    const filteredCompanies = getFilteredCompanies();
    renderUniverseChart(filteredCompanies);
    renderLeaderboard(filteredCompanies);
}

async function loadTraining() {
    const [lessons, dataset] = await Promise.all([
        fetchJson(`${TRAINING_API}/lessons`),
        loadTrainingUniverse()
    ]);

    trainingSourceLabel = dataset.source === "Offline simulation dataset"
        ? "Offline training arena"
        : `${dataset.source} training arena`;
    companyUniverse = dataset.companies;

    renderLessons(lessons);
    renderHeroMetrics(companyUniverse);
    renderSectorFilter(companyUniverse);
    renderCompanySelect(companyUniverse);
    refreshUniverseViews();

    const preferredCompany = companyUniverse.find((company) => company.symbol === "AAPL") || companyUniverse[0];
    if (preferredCompany) {
        await selectCompany(preferredCompany.symbol);
    }

    renderPortfolio();
}

companySelect.addEventListener("change", () => {
    selectCompany(companySelect.value).catch(console.error);
});

sectorFilter.addEventListener("change", () => {
    const filteredCompanies = getFilteredCompanies();
    renderUniverseChart(filteredCompanies);
    renderLeaderboard(filteredCompanies);

    if (selectedSymbol && filteredCompanies.some((company) => company.symbol === selectedSymbol)) {
        updateSelectedCompany(selectedSymbol);
    } else if (filteredCompanies.length) {
        updateSelectedCompany(filteredCompanies[0].symbol);
    }
});

rankingMetric.addEventListener("change", refreshUniverseViews);
buyButton.addEventListener("click", () => executeTrade("BUY"));
sellButton.addEventListener("click", () => executeTrade("SELL"));
riskButton.addEventListener("click", applyRiskSizing);
resetPortfolioButton.addEventListener("click", resetPortfolio);
resetUniverseZoomButton.addEventListener("click", () => {
    if (universeChart) {
        universeChart.resetZoom();
    }
});
resetDetailZoomButton.addEventListener("click", () => {
    if (companyPriceChart) {
        companyPriceChart.resetZoom();
    }
    if (companySignalChart) {
        companySignalChart.resetZoom();
    }
});

initializeLeaderboardEvents();

loadTraining().catch((error) => {
    console.error(error);
    setFeedback("Training mode could not load the dataset. Check that the backend is running and reload the page.", "negative");
});
