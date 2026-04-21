# InVested

Full-stack stock analytics and investing education app using:

- Frontend: HTML, CSS, JavaScript, Chart.js
- Backend: Java Spring Boot
- Database: H2 for local development, MySQL-ready profile for real database usage

## Pages

- `frontend/index.html`: dashboard with symbol search, zoomable price charts, and model-based forecasts
- `frontend/markets.html`: sector allocation chart and stock table
- `frontend/analytics.html`: interactive price, PE ratio, and volume comparisons
- `frontend/training.html`: student-friendly training mode with a paper-trading simulator, 500-company arena, and layered teaching charts

## Backend API

- `GET /api/stocks`
- `GET /api/stocks/summary?symbol=AAPL`
- `GET /api/stocks/series?symbol=AAPL`
- `GET /api/stocks/top-movers`
- `GET /api/stocks/sectors`
- `GET /api/stocks/analytics`
- `GET /api/stocks/prediction?symbol=AAPL&model=linear-regression&months=1`
- `GET /api/training/lessons`
- `GET /api/training/live-company?symbol=AAPL`

## Run Locally With Seeded Data

On Windows, you can start both the backend and frontend with:

```powershell
.\start-app.bat
```

The script opens one terminal for Spring Boot and one terminal for the static frontend server.

If you prefer to run each part manually:

```bash
mvn spring-boot:run
```

The default profile uses H2 and loads seeded quote/history data from `src/main/resources/data.sql`.
The current seed is a large Yahoo Finance-backed S&P 500-style dataset with multi-year daily history for the dashboard filters.

Useful URLs:

- `http://localhost:8081/api/stocks`
- `http://localhost:8081/h2-console`

## Run Frontend

```bash
cd frontend
python -m http.server 5500
```

Then open:

- `http://localhost:5500`
- `http://localhost:5500/markets.html`
- `http://localhost:5500/analytics.html`
- `http://localhost:5500/training.html`

## Switch To MySQL

1. Create or use a MySQL database named `stocksdb`.
2. Update credentials in `src/main/resources/application-mysql.properties`.
3. Start the backend with:

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=mysql
```

4. Import your own larger seed or market dataset. A starter file lives at:

- `database/mysql/seed_stocks.sql`

## yfinance Import Path

The repo includes a helper script at `tools/yfinance_import.py` plus `tools/requirements.txt`.

Example:

```bash
cd tools
pip install -r requirements.txt
python yfinance_import.py --symbols AAPL MSFT NVDA AMZN GOOGL --period 6mo --output ../data/yfinance_quotes.csv
```

This path is best for research, education, and dataset preparation. `yfinance` is not an official Yahoo Finance product and its PyPI page states the Yahoo Finance API is intended for personal use.

To regenerate the dashboard backend seed with a broad 5-year dataset:

```bash
python tools/yfinance_backend_seed.py --period 5y --output src/main/resources/data.sql
```

The original tiny demo seed is saved at:

- `database/seed_stocks_small.sql`

## Training Universe Dataset

The training page will automatically use `frontend/data/training-universe.json` when it exists, and otherwise falls back to an offline simulated universe built from the seeded backend data.

When a company is selected from the training dropdown, the frontend also tries to refresh that one symbol live through `yfinance` by calling the backend endpoint above. If that live request fails, the page keeps using the current arena dataset for that selection.

To generate a Yahoo-backed dataset:

```bash
cd tools
pip install -r requirements.txt
python yfinance_training_dataset.py --limit 500 --period 6mo --output ../frontend/data/training-universe.json
```

By default the script pulls the S&P 500 ticker list from Wikipedia, then fetches quote metadata and history from Yahoo Finance.

## Note On Large Datasets

The app now has a scalable schema and seeded records for development, but a truly large stock dataset should be imported from CSV files, a market data vendor, or your own ETL process rather than committed directly into the frontend repo.
