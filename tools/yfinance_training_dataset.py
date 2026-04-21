import argparse
import json
import math
from pathlib import Path

import pandas as pd
import yfinance as yf


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def unique_symbols(values: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        symbol = value.strip().upper().replace(".", "-")
        if symbol and symbol not in seen:
            ordered.append(symbol)
            seen.add(symbol)
    return ordered


def load_symbols(args: argparse.Namespace) -> list[str]:
    if args.symbols:
        return unique_symbols(args.symbols)[:args.limit]

    if args.symbols_file:
        file_symbols = Path(args.symbols_file).read_text(encoding="utf-8").splitlines()
        return unique_symbols(file_symbols)[:args.limit]

    if args.universe != "sp500":
        raise ValueError("Only the sp500 universe is supported without a symbols file.")

    tables = pd.read_html("https://en.wikipedia.org/wiki/List_of_S%26P_500_companies")
    sp500 = tables[0]["Symbol"].astype(str).tolist()
    return unique_symbols(sp500)[:args.limit]


def score_company(change_percent: float, market_cap: int, volume: int, pe_ratio: float, dividend_yield: float) -> dict:
    valuation_score = clamp(92 - (pe_ratio * 1.7), 12, 96)
    momentum_score = clamp(52 + (change_percent * 7.5) - (pe_ratio * 0.15), 10, 98)
    volatility_score = clamp(24 + (abs(change_percent) * 16) + max(0, 18 - pe_ratio * 0.4), 16, 95)
    quality_score = clamp(34 + (math.log10(market_cap + 1) * 8.5) + (math.log10(volume + 1) * 3.8) - (volatility_score * 0.12), 18, 98)
    liquidity_score = clamp(18 + (math.log10(volume + 1) * 11.2), 18, 98)
    income_score = clamp(14 + (dividend_yield * 15), 8, 95)

    return {
        "valuationScore": round(valuation_score, 1),
        "momentumScore": round(momentum_score, 1),
        "volatilityScore": round(volatility_score, 1),
        "qualityScore": round(quality_score, 1),
        "liquidityScore": round(liquidity_score, 1),
        "incomeScore": round(income_score, 1),
    }


def build_history(history_frame: pd.DataFrame) -> list[dict]:
    date_column = "Date" if "Date" in history_frame.columns else history_frame.columns[0]

    return [
        {
            "label": pd.Timestamp(row[date_column]).date().isoformat(),
            "price": round(float(row["Close"]), 2),
            "volume": int(row["Volume"] or 0),
        }
        for _, row in history_frame.tail(120).iterrows()
    ]


def build_company(symbol: str, period: str) -> dict | None:
    ticker = yf.Ticker(symbol)
    history = ticker.history(period=period, interval="1d", auto_adjust=False).reset_index()
    if history.empty or len(history.index) < 45:
        return None

    info = ticker.info or {}
    closes = history["Close"].astype(float)
    current_price = float(closes.iloc[-1])
    previous_close = float(closes.iloc[-2]) if len(closes.index) > 1 else current_price
    change_percent = ((current_price - previous_close) / previous_close * 100) if previous_close else 0.0
    market_cap = int(info.get("marketCap") or 0)
    volume = int(history["Volume"].iloc[-1] or 0)
    pe_ratio = float(info.get("trailingPE") or 0)
    dividend_yield = float((info.get("dividendYield") or 0) * 100)

    company = {
        "symbol": symbol,
        "companyName": info.get("longName") or info.get("shortName") or symbol,
        "sector": info.get("sector") or "Unknown",
        "exchange": info.get("exchange") or "Unknown",
        "currentPrice": round(current_price, 2),
        "changePercent": round(change_percent, 2),
        "volume": volume,
        "marketCap": market_cap,
        "peRatio": round(pe_ratio, 1),
        "dividendYield": round(dividend_yield, 2),
        "history": build_history(history),
    }

    company.update(score_company(change_percent, market_cap, volume, pe_ratio, dividend_yield))
    return company


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a Yahoo Finance training dataset for the InVested training page.")
    parser.add_argument("--symbols", nargs="+", help="Explicit ticker list")
    parser.add_argument("--symbols-file", help="Optional file containing one ticker per line")
    parser.add_argument("--universe", default="sp500", help="Universe shortcut. Default: sp500")
    parser.add_argument("--limit", type=int, default=500, help="Maximum number of companies to export")
    parser.add_argument("--period", default="6mo", help="History period to request from Yahoo Finance")
    parser.add_argument("--output", default="../frontend/data/training-universe.json", help="Output JSON path")
    args = parser.parse_args()

    symbols = load_symbols(args)
    companies: list[dict] = []

    print(f"Preparing dataset for {len(symbols)} symbols...")
    for index, symbol in enumerate(symbols, start=1):
        try:
            company = build_company(symbol, args.period)
        except Exception as error:  # noqa: BLE001
            print(f"[{index}/{len(symbols)}] Skipped {symbol}: {error}")
            continue

        if company is None:
            print(f"[{index}/{len(symbols)}] Skipped {symbol}: insufficient history")
            continue

        companies.append(company)
        print(f"[{index}/{len(symbols)}] Added {symbol}")

    payload = {
        "generatedAt": pd.Timestamp.utcnow().isoformat(),
        "source": "Yahoo Finance",
        "companies": companies,
    }

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {len(companies)} companies to {output_path}")


if __name__ == "__main__":
    main()
