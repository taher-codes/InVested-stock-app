let sectorChart;

function renderStocksTable(stocks) {
    const tableBody = document.getElementById("stocksTableBody");
    tableBody.innerHTML = stocks.map((stock) => `
        <tr>
            <td>${stock.symbol}</td>
            <td>${stock.companyName}</td>
            <td>${stock.sector}</td>
            <td>${currency(stock.currentPrice)}</td>
            <td class="${changeClass(stock.changePercent)}">${percent(stock.changePercent)}</td>
            <td>${number(stock.volume)}</td>
        </tr>
    `).join("");
}

function renderSectorChart(sectors) {
    if (sectorChart) {
        sectorChart.destroy();
    }

    sectorChart = new Chart(document.getElementById("sectorChart"), {
        type: "doughnut",
        data: {
            labels: sectors.map((item) => item.sector),
            datasets: [{
                data: sectors.map((item) => item.companies),
                backgroundColor: ["#0b6e4f", "#d17b0f", "#4f46e5", "#b91c1c", "#0f766e", "#7c3aed"]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

async function loadMarketsPage() {
    const [stocks, sectors] = await Promise.all([
        fetchJson(API_BASE),
        fetchJson(`${API_BASE}/sectors`)
    ]);

    renderStocksTable(stocks);
    renderSectorChart(sectors);
}

loadMarketsPage().catch(console.error);
