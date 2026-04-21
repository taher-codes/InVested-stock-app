import argparse
from io import StringIO
import math
from pathlib import Path
from urllib.request import Request, urlopen

import pandas as pd
import yfinance as yf


PRICE_FIELDS = ("Open", "High", "Low", "Close", "Volume")


def sql_string(value: object) -> str:
    text = str(value or "Unknown").replace("'", "''")
    return f"'{text}'"


def clean_symbol(value: str) -> str:
    return value.strip().upper().replace(".", "-")


def clean_number(value: object, default: float = 0.0) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    if math.isnan(number) or math.isinf(number):
        return default
    return number


def clean_int(value: object, default: int = 0) -> int:
    return max(0, int(clean_number(value, default)))


def clean_price(value: object, default: float = 1.0) -> float:
    return max(0.01, clean_number(value, default))


def decimal_sql(value: object, default: float = 0.0) -> str:
    return f"{clean_number(value, default):.2f}"


def load_universe(args: argparse.Namespace) -> list[dict]:
    if args.symbols:
        return [
            {
                "symbol": clean_symbol(symbol),
                "company_name": clean_symbol(symbol),
                "sector": "Unknown",
            }
            for symbol in args.symbols
        ][: args.limit]

    if args.symbols_file:
        symbols = Path(args.symbols_file).read_text(encoding="utf-8").splitlines()
        return [
            {
                "symbol": clean_symbol(symbol),
                "company_name": clean_symbol(symbol),
                "sector": "Unknown",
            }
            for symbol in symbols
            if symbol.strip()
        ][: args.limit]

    if args.universe != "sp500":
        raise ValueError("Only the sp500 universe is supported without --symbols or --symbols-file.")

    request = Request(
        "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies",
        headers={"User-Agent": "Mozilla/5.0 InVested local data importer"},
    )
    with urlopen(request, timeout=30) as response:
        html = response.read().decode("utf-8")

    tables = pd.read_html(StringIO(html))
    frame = tables[0]
    rows = []
    for _, row in frame.iterrows():
        rows.append(
            {
                "symbol": clean_symbol(str(row["Symbol"])),
                "company_name": str(row["Security"]),
                "sector": str(row["GICS Sector"]),
            }
        )
    return rows[: args.limit]


def split_chunks(values: list[dict], size: int) -> list[list[dict]]:
    return [values[index : index + size] for index in range(0, len(values), size)]


def normalize_download_frame(frame: pd.DataFrame, symbols: list[str]) -> dict[str, pd.DataFrame]:
    if frame.empty:
        return {}

    if isinstance(frame.columns, pd.MultiIndex):
        first_level = set(str(value).upper() for value in frame.columns.get_level_values(0))
        second_level = set(str(value) for value in frame.columns.get_level_values(1))
        by_symbol = {}
        for symbol in symbols:
            if symbol in first_level:
                company_frame = frame[symbol]
            elif symbol in second_level:
                company_frame = frame.xs(symbol, axis=1, level=1)
            else:
                continue
            available_fields = [field for field in PRICE_FIELDS if field in company_frame.columns]
            if "Close" in available_fields:
                by_symbol[symbol] = company_frame[available_fields].dropna(subset=["Close"])
        return by_symbol

    if len(symbols) == 1 and "Close" in frame.columns:
        available_fields = [field for field in PRICE_FIELDS if field in frame.columns]
        return {symbols[0]: frame[available_fields].dropna(subset=["Close"])}

    return {}


def download_history(universe: list[dict], period: str, chunk_size: int) -> dict[str, pd.DataFrame]:
    histories: dict[str, pd.DataFrame] = {}
    chunks = split_chunks(universe, chunk_size)
    for index, chunk in enumerate(chunks, start=1):
        symbols = [company["symbol"] for company in chunk]
        print(f"Downloading history chunk {index}/{len(chunks)}: {', '.join(symbols[:4])}...")
        frame = yf.download(
            tickers=" ".join(symbols),
            period=period,
            interval="1d",
            group_by="ticker",
            auto_adjust=False,
            threads=True,
            progress=False,
        )
        histories.update(normalize_download_frame(frame, symbols))
    return histories


def quote_row(quote_id: int, company: dict, history: pd.DataFrame, updated_at: str) -> str:
    latest = history.iloc[-1]
    previous = history.iloc[-2] if len(history.index) > 1 else latest
    current_price = clean_price(latest.get("Close"))
    previous_close = clean_price(previous.get("Close"), current_price)
    open_price = clean_price(latest.get("Open"), current_price)
    day_high = clean_price(latest.get("High"), current_price)
    day_low = clean_price(latest.get("Low"), current_price)
    volume = clean_int(latest.get("Volume"))

    return (
        f"({quote_id}, "
        f"{sql_string(company['symbol'])}, "
        f"{sql_string(company['company_name'])}, "
        f"{sql_string(company['sector'])}, "
        f"'Yahoo', "
        f"{decimal_sql(current_price)}, "
        f"{decimal_sql(open_price, current_price)}, "
        f"{decimal_sql(previous_close, current_price)}, "
        f"{decimal_sql(day_high, current_price)}, "
        f"{decimal_sql(day_low, current_price)}, "
        f"{volume}, "
        f"0, "
        f"0.00, "
        f"0.00, "
        f"{sql_string(updated_at)})"
    )


def history_rows(quote_id: int, history: pd.DataFrame, starting_history_id: int) -> list[str]:
    rows = []
    history_id = starting_history_id
    for date_value, row in history.iterrows():
        close_price = clean_price(row.get("Close"))
        volume = clean_int(row.get("Volume"))
        trading_date = pd.Timestamp(date_value).date().isoformat()
        rows.append(f"({history_id}, {quote_id}, '{trading_date}', {decimal_sql(close_price)}, {volume})")
        history_id += 1
    return rows


def write_insert(output, table: str, columns: str, rows: list[str], batch_size: int) -> None:
    for index in range(0, len(rows), batch_size):
        batch = rows[index : index + batch_size]
        output.write(f"INSERT INTO {table} ({columns}) VALUES\n")
        output.write(",\n".join(batch))
        output.write(";\n\n")


def write_seed(output_path: Path, universe: list[dict], histories: dict[str, pd.DataFrame], batch_size: int) -> tuple[int, int]:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    updated_at = pd.Timestamp.utcnow().strftime("%Y-%m-%dT%H:%M:%S")
    quote_rows = []
    all_history_rows = []
    quote_id = 1
    history_id = 1

    for company in universe:
        symbol = company["symbol"]
        history = histories.get(symbol)
        if history is None or history.empty:
            print(f"Skipping {symbol}: no usable history")
            continue

        history = history.sort_index()
        quote_rows.append(quote_row(quote_id, company, history, updated_at))
        rows = history_rows(quote_id, history, history_id)
        all_history_rows.extend(rows)
        history_id += len(rows)
        quote_id += 1

    with output_path.open("w", encoding="utf-8", newline="\n") as output:
        output.write("-- Generated by tools/yfinance_backend_seed.py\n")
        output.write("-- Source: Yahoo Finance via yfinance. For education and local demos only.\n\n")
        write_insert(
            output,
            "stock_quotes",
            "id, symbol, company_name, sector, exchange, current_price, open_price, previous_close, day_high, day_low, volume, market_cap, pe_ratio, dividend_yield, updated_at",
            quote_rows,
            batch_size,
        )
        write_insert(
            output,
            "stock_history",
            "id, stock_id, trading_date, close_price, volume",
            all_history_rows,
            batch_size,
        )

    return len(quote_rows), len(all_history_rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate backend data.sql from Yahoo Finance history.")
    parser.add_argument("--symbols", nargs="+", help="Explicit ticker symbols")
    parser.add_argument("--symbols-file", help="Optional file containing one ticker per line")
    parser.add_argument("--universe", default="sp500", help="Universe shortcut. Default: sp500")
    parser.add_argument("--limit", type=int, default=1000, help="Maximum number of companies")
    parser.add_argument("--period", default="5y", help="History period for yfinance, e.g. 1y, 5y, max")
    parser.add_argument("--chunk-size", type=int, default=50, help="Download symbols per request")
    parser.add_argument("--batch-size", type=int, default=500, help="Rows per SQL insert")
    parser.add_argument("--output", default="../src/main/resources/data.sql", help="Output SQL path")
    args = parser.parse_args()

    universe = load_universe(args)
    print(f"Preparing backend seed for {len(universe)} companies over {args.period}...")
    histories = download_history(universe, args.period, args.chunk_size)
    output_path = Path(args.output)
    quote_count, history_count = write_seed(output_path, universe, histories, args.batch_size)
    print(f"Wrote {quote_count} quotes and {history_count} history rows to {output_path}")


if __name__ == "__main__":
    main()
