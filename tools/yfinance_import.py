import argparse
from pathlib import Path

import pandas as pd
import yfinance as yf


def build_rows(symbols: list[str], period: str) -> pd.DataFrame:
    rows: list[dict] = []
    for symbol in symbols:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        history = ticker.history(period=period, auto_adjust=False).reset_index()
        if history.empty:
            continue

        latest = history.iloc[-1]
        rows.append(
            {
                "symbol": symbol.upper(),
                "company_name": info.get("longName") or info.get("shortName") or symbol.upper(),
                "sector": info.get("sector") or "Unknown",
                "exchange": info.get("exchange") or "Unknown",
                "current_price": float(latest["Close"]),
                "open_price": float(latest["Open"]),
                "previous_close": float(info.get("previousClose") or latest["Close"]),
                "day_high": float(latest["High"]),
                "day_low": float(latest["Low"]),
                "volume": int(latest["Volume"]),
                "market_cap": int(info.get("marketCap") or 0),
                "pe_ratio": float(info.get("trailingPE") or 0),
                "dividend_yield": float((info.get("dividendYield") or 0) * 100),
                "updated_at": pd.Timestamp.utcnow().isoformat(),
            }
        )
    return pd.DataFrame(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch stock metadata with yfinance for InVested.")
    parser.add_argument("--symbols", nargs="+", required=True, help="Ticker symbols, e.g. AAPL MSFT NVDA")
    parser.add_argument("--period", default="6mo", help="History period passed to yfinance")
    parser.add_argument("--output", default="data/yfinance_quotes.csv", help="CSV output path")
    args = parser.parse_args()

    frame = build_rows(args.symbols, args.period)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(output_path, index=False)
    print(f"Wrote {len(frame)} rows to {output_path}")


if __name__ == "__main__":
    main()
