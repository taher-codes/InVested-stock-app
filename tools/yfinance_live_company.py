import argparse
import json
import sys

import pandas as pd
import yfinance as yf


def to_float(value, default=0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def to_int(value, default=0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return int(default)


def build_history(history_frame: pd.DataFrame) -> list[dict]:
    date_column = "Date" if "Date" in history_frame.columns else history_frame.columns[0]
    return [
        {
            "label": pd.Timestamp(row[date_column]).date().isoformat(),
            "price": round(to_float(row["Close"]), 2),
            "volume": to_int(row["Volume"]),
        }
        for _, row in history_frame.tail(120).iterrows()
    ]


def build_company(symbol: str, period: str) -> dict:
    ticker = yf.Ticker(symbol)
    history = ticker.history(period=period, interval="1d", auto_adjust=False).reset_index()
    if history.empty or len(history.index) < 45:
        raise RuntimeError(f"Not enough Yahoo Finance history is available for {symbol}.")

    try:
        info = ticker.info or {}
    except Exception:
        info = {}

    try:
        fast_info = dict(ticker.fast_info or {})
    except Exception:
        fast_info = {}

    closes = history["Close"].astype(float)
    current_price = to_float(fast_info.get("lastPrice") or fast_info.get("last_price"), closes.iloc[-1])
    fallback_previous_close = closes.iloc[-2] if len(closes.index) > 1 else current_price
    previous_close = to_float(
        info.get("previousClose")
        or fast_info.get("previousClose")
        or fast_info.get("previous_close"),
        fallback_previous_close
    )
    change_percent = ((current_price - previous_close) / previous_close * 100) if previous_close else 0.0

    return {
        "symbol": symbol,
        "companyName": info.get("longName") or info.get("shortName") or symbol,
        "sector": info.get("sector") or "Unknown",
        "exchange": info.get("exchange") or "Unknown",
        "currentPrice": round(current_price, 2),
        "changePercent": round(change_percent, 2),
        "volume": to_int(history["Volume"].iloc[-1] or fast_info.get("lastVolume") or fast_info.get("last_volume")),
        "marketCap": to_int(info.get("marketCap") or fast_info.get("marketCap") or fast_info.get("market_cap")),
        "peRatio": round(to_float(info.get("trailingPE")), 1),
        "dividendYield": round(to_float(info.get("dividendYield")) * 100, 2),
        "history": build_history(history),
        "source": "Live Yahoo Finance",
        "updatedAt": pd.Timestamp.utcnow().isoformat(),
        "liveEligible": True,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch one live company snapshot for the InVested training page.")
    parser.add_argument("--symbol", required=True, help="Ticker symbol, for example AAPL")
    parser.add_argument("--period", default="6mo", help="Yahoo Finance history period")
    args = parser.parse_args()

    symbol = args.symbol.strip().upper().replace(".", "-")
    if not symbol:
        raise RuntimeError("A symbol is required.")

    company = build_company(symbol, args.period)
    print(json.dumps(company), end="")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
