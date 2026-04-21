let priceVsPeChart;
let volumeChart;

function renderPriceVsPe(data) {
    if (priceVsPeChart) {
        priceVsPeChart.destroy();
    }

    const points = data.symbols.map((symbol, index) => ({
        x: Number(data.peRatios[index]),
        y: Number(data.prices[index]),
        label: symbol
    }));

    priceVsPeChart = new Chart(document.getElementById("priceVsPeChart"), {
        type: "scatter",
        data: {
            datasets: [{
                label: "Stocks",
                data: points,
                backgroundColor: "#0b6e4f"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label(context) {
                            const point = points[context.dataIndex];
                            return `${point.label}: PE ${point.x}, Price ${currency(point.y)}`;
                        }
                    }
                },
                zoom: zoomOptions()
            },
            scales: {
                x: { title: { display: true, text: "PE Ratio" } },
                y: { title: { display: true, text: "Price" } }
            }
        }
    });
}

function renderVolume(data) {
    if (volumeChart) {
        volumeChart.destroy();
    }

    volumeChart = new Chart(document.getElementById("volumeChart"), {
        type: "bar",
        data: {
            labels: data.symbols,
            datasets: [{
                label: "Volume",
                data: data.volumes,
                backgroundColor: "#4f46e5"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { zoom: zoomOptions() }
        }
    });
}

async function loadAnalytics() {
    const data = await fetchJson(`${API_BASE}/analytics`);
    renderPriceVsPe(data);
    renderVolume(data);
}

loadAnalytics().catch(console.error);
