package com.stocksapp.service;

import com.stocksapp.dto.AnalyticsDto;
import com.stocksapp.dto.DashboardSummaryDto;
import com.stocksapp.dto.PricePointDto;
import com.stocksapp.dto.PredictionResponseDto;
import com.stocksapp.dto.SectorAllocationDto;
import com.stocksapp.dto.StockCardDto;
import com.stocksapp.model.StockHistory;
import com.stocksapp.model.StockQuote;
import com.stocksapp.repository.StockHistoryRepository;
import com.stocksapp.repository.StockQuoteRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class StockService {

    private final StockQuoteRepository stockQuoteRepository;
    private final StockHistoryRepository stockHistoryRepository;

    public StockService(StockQuoteRepository stockQuoteRepository, StockHistoryRepository stockHistoryRepository) {
        this.stockQuoteRepository = stockQuoteRepository;
        this.stockHistoryRepository = stockHistoryRepository;
    }

    public DashboardSummaryDto getDashboardSummary(String symbol) {
        StockQuote stock = getStockBySymbol(symbol);
        return new DashboardSummaryDto(
                stock.getSymbol(),
                stock.getCompanyName(),
                stock.getCurrentPrice(),
                calculateChangePercent(stock),
                "Market Snapshot",
                stock.getVolume(),
                stock.getPeRatio()
        );
    }

    public List<PricePointDto> getPriceSeries(String symbol) {
        return stockHistoryRepository.findByStockSymbolIgnoreCaseOrderByTradingDateAsc(symbol)
                .stream()
                .map(history -> new PricePointDto(
                        history.getTradingDate().toString(),
                        history.getClosePrice(),
                        history.getVolume()
                ))
                .toList();
    }

    public List<StockCardDto> getStocks() {
        return stockQuoteRepository.findAllByOrderByMarketCapDesc().stream().map(this::toCard).toList();
    }

    public List<StockCardDto> getTopMovers() {
        return stockQuoteRepository.findAll().stream()
                .map(this::toCard)
                .sorted(Comparator.comparing(StockCardDto::changePercent).reversed())
                .limit(5)
                .toList();
    }

    public List<SectorAllocationDto> getSectorAllocation() {
        Map<String, List<StockQuote>> bySector = stockQuoteRepository.findAll().stream()
                .collect(Collectors.groupingBy(StockQuote::getSector));

        return bySector.entrySet().stream()
                .map(entry -> new SectorAllocationDto(entry.getKey(), entry.getValue().size(), averagePrice(entry.getValue())))
                .sorted(Comparator.comparing(SectorAllocationDto::companies).reversed())
                .toList();
    }

    public AnalyticsDto getAnalytics() {
        List<StockQuote> largest = stockQuoteRepository.findTop8ByOrderByMarketCapDesc();
        return new AnalyticsDto(
                largest.stream().map(StockQuote::getSymbol).toList(),
                largest.stream().map(StockQuote::getCurrentPrice).toList(),
                largest.stream().map(stock -> stock.getPeRatio() == null ? BigDecimal.ZERO : stock.getPeRatio()).toList(),
                largest.stream().map(StockQuote::getVolume).toList()
        );
    }

    public PredictionResponseDto getPrediction(String symbol, String model, int months) {
        StockQuote selected = getStockBySymbol(symbol);
        String normalizedModel = normalizeModel(model);
        int effectiveMonths = Math.max(1, Math.min(months, 6));
        List<StockHistory> history = stockHistoryRepository.findByStockSymbolIgnoreCaseOrderByTradingDateAsc(selected.getSymbol());
        if (history.isEmpty()) {
            history = stockHistoryRepository.findByStockSymbolIgnoreCaseOrderByTradingDateAsc("AAPL");
        }

        List<PricePointDto> historyPoints = history.stream()
                .map(item -> new PricePointDto(item.getTradingDate().toString(), item.getClosePrice(), item.getVolume()))
                .toList();

        List<PricePointDto> forecast = buildForecast(history, normalizedModel, effectiveMonths);

        return new PredictionResponseDto(
                selected.getSymbol(),
                normalizedModel,
                effectiveMonths,
                predictionExplanation(normalizedModel),
                historyPoints,
                forecast
        );
    }

    private StockQuote getStockBySymbol(String symbol) {
        String normalized = symbol == null || symbol.isBlank() ? "AAPL" : symbol.trim().toUpperCase(Locale.US);
        return stockQuoteRepository.findBySymbolIgnoreCase(normalized)
                .orElseGet(() -> stockQuoteRepository.findBySymbolIgnoreCase("AAPL")
                        .orElseThrow(() -> new IllegalStateException("Seed data missing for AAPL")));
    }

    private StockCardDto toCard(StockQuote stock) {
        return new StockCardDto(
                stock.getSymbol(),
                stock.getCompanyName(),
                stock.getSector(),
                stock.getCurrentPrice(),
                calculateChangePercent(stock),
                stock.getVolume(),
                stock.getMarketCap()
        );
    }

    private BigDecimal calculateChangePercent(StockQuote stock) {
        if (stock.getPreviousClose() == null || BigDecimal.ZERO.compareTo(stock.getPreviousClose()) == 0) {
            return BigDecimal.ZERO;
        }
        return stock.getCurrentPrice().subtract(stock.getPreviousClose())
                .multiply(BigDecimal.valueOf(100))
                .divide(stock.getPreviousClose(), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal averagePrice(List<StockQuote> stocks) {
        if (stocks.isEmpty()) {
            return BigDecimal.ZERO;
        }
        BigDecimal total = stocks.stream().map(StockQuote::getCurrentPrice).reduce(BigDecimal.ZERO, BigDecimal::add);
        return total.divide(BigDecimal.valueOf(stocks.size()), 2, RoundingMode.HALF_UP);
    }

    private List<PricePointDto> buildForecast(List<StockHistory> history, String model, int months) {
        int tradingDays = months * 22;
        LocalDate lastDate = history.get(history.size() - 1).getTradingDate();
        BigDecimal lastPrice = history.get(history.size() - 1).getClosePrice();
        BigDecimal averageDelta = averageDelta(history);
        BigDecimal regressionSlope = regressionSlope(history);
        BigDecimal movingAverage = movingAverage(history, 5);
        BigDecimal longMovingAverage = movingAverage(history, 20);
        BigDecimal recentDelta = averageDelta(history, 5);
        BigDecimal smoothedDelta = exponentialSmoothedDelta(history);
        BigDecimal averageVolatility = averageAbsoluteDelta(history);
        BigDecimal recentHigh = highestClose(history, 20);

        return java.util.stream.IntStream.rangeClosed(1, tradingDays)
                .mapToObj(index -> {
                    LocalDate forecastDate = nextTradingDay(lastDate, index);
                    BigDecimal predictedPrice = switch (model) {
                        case "moving-average" -> movingAverage
                                .add(BigDecimal.valueOf(index).multiply(averageDelta).multiply(BigDecimal.valueOf(0.35)));
                        case "momentum" -> lastPrice.add(averageDelta.multiply(BigDecimal.valueOf(index)));
                        case "mean-reversion" -> lastPrice
                                .add(longMovingAverage.subtract(lastPrice)
                                        .multiply(BigDecimal.valueOf(index))
                                        .multiply(BigDecimal.valueOf(0.08)))
                                .add(averageDelta.multiply(BigDecimal.valueOf(index)).multiply(BigDecimal.valueOf(0.20)));
                        case "exponential-smoothing" -> lastPrice
                                .add(smoothedDelta.multiply(BigDecimal.valueOf(index)));
                        case "volatility-adjusted" -> lastPrice
                                .add(dampenTrend(
                                        regressionSlope.multiply(BigDecimal.valueOf(index)),
                                        averageVolatility.multiply(BigDecimal.valueOf(index)).multiply(BigDecimal.valueOf(0.08))
                                ));
                        case "breakout" -> lastPrice
                                .add(recentHigh.subtract(lastPrice).max(BigDecimal.ZERO).multiply(BigDecimal.valueOf(0.15)))
                                .add(recentDelta.multiply(BigDecimal.valueOf(index)).multiply(BigDecimal.valueOf(1.10)));
                        default -> lastPrice.add(regressionSlope.multiply(BigDecimal.valueOf(index)));
                    };
                    if (predictedPrice.compareTo(BigDecimal.ONE) < 0) {
                        predictedPrice = BigDecimal.ONE;
                    }
                    return new PricePointDto(
                            forecastDate.toString(),
                            predictedPrice.setScale(2, RoundingMode.HALF_UP),
                            0L
                    );
                })
                .toList();
    }

    private BigDecimal averageDelta(List<StockHistory> history) {
        return averageDelta(history, history.size());
    }

    private BigDecimal averageDelta(List<StockHistory> history, int window) {
        if (history.size() < 2) {
            return BigDecimal.ZERO;
        }

        BigDecimal totalDelta = BigDecimal.ZERO;
        int start = Math.max(1, history.size() - Math.max(1, window));
        int count = 0;
        for (int index = start; index < history.size(); index++) {
            totalDelta = totalDelta.add(history.get(index).getClosePrice().subtract(history.get(index - 1).getClosePrice()));
            count++;
        }
        return totalDelta.divide(BigDecimal.valueOf(count), 4, RoundingMode.HALF_UP);
    }

    private BigDecimal movingAverage(List<StockHistory> history, int window) {
        int start = Math.max(0, history.size() - window);
        BigDecimal total = BigDecimal.ZERO;
        for (int index = start; index < history.size(); index++) {
            total = total.add(history.get(index).getClosePrice());
        }
        return total.divide(BigDecimal.valueOf(history.size() - start), 4, RoundingMode.HALF_UP);
    }

    private BigDecimal averageAbsoluteDelta(List<StockHistory> history) {
        if (history.size() < 2) {
            return BigDecimal.ZERO;
        }

        BigDecimal totalDelta = BigDecimal.ZERO;
        for (int index = 1; index < history.size(); index++) {
            totalDelta = totalDelta.add(history.get(index).getClosePrice()
                    .subtract(history.get(index - 1).getClosePrice())
                    .abs());
        }
        return totalDelta.divide(BigDecimal.valueOf(history.size() - 1L), 4, RoundingMode.HALF_UP);
    }

    private BigDecimal exponentialSmoothedDelta(List<StockHistory> history) {
        if (history.size() < 2) {
            return BigDecimal.ZERO;
        }

        double alpha = 0.45;
        double smoothedDelta = history.get(1).getClosePrice()
                .subtract(history.get(0).getClosePrice())
                .doubleValue();
        int start = Math.max(2, history.size() - 20);
        for (int index = start; index < history.size(); index++) {
            double delta = history.get(index).getClosePrice()
                    .subtract(history.get(index - 1).getClosePrice())
                    .doubleValue();
            smoothedDelta = (alpha * delta) + ((1 - alpha) * smoothedDelta);
        }
        return BigDecimal.valueOf(smoothedDelta).setScale(4, RoundingMode.HALF_UP);
    }

    private BigDecimal highestClose(List<StockHistory> history, int window) {
        int start = Math.max(0, history.size() - window);
        return history.subList(start, history.size()).stream()
                .map(StockHistory::getClosePrice)
                .max(Comparator.naturalOrder())
                .orElse(BigDecimal.ZERO);
    }

    private BigDecimal dampenTrend(BigDecimal trend, BigDecimal dampener) {
        if (trend.signum() > 0) {
            return trend.subtract(dampener).max(BigDecimal.ZERO);
        }
        if (trend.signum() < 0) {
            return trend.add(dampener).min(BigDecimal.ZERO);
        }
        return BigDecimal.ZERO;
    }

    private BigDecimal regressionSlope(List<StockHistory> history) {
        int size = history.size();
        if (size < 2) {
            return BigDecimal.ZERO;
        }

        double meanX = (size - 1) / 2.0;
        double meanY = history.stream()
                .map(StockHistory::getClosePrice)
                .mapToDouble(BigDecimal::doubleValue)
                .average()
                .orElse(0.0);

        double numerator = 0.0;
        double denominator = 0.0;
        for (int index = 0; index < size; index++) {
            double x = index - meanX;
            double y = history.get(index).getClosePrice().doubleValue() - meanY;
            numerator += x * y;
            denominator += x * x;
        }

        if (denominator == 0.0) {
            return BigDecimal.ZERO;
        }

        return BigDecimal.valueOf(numerator / denominator).setScale(4, RoundingMode.HALF_UP);
    }

    private LocalDate nextTradingDay(LocalDate startDate, int offset) {
        LocalDate candidate = startDate;
        int added = 0;
        while (added < offset) {
            candidate = candidate.plusDays(1);
            if (candidate.getDayOfWeek() != DayOfWeek.SATURDAY && candidate.getDayOfWeek() != DayOfWeek.SUNDAY) {
                added++;
            }
        }
        return candidate;
    }

    private String normalizeModel(String model) {
        if (model == null || model.isBlank()) {
            return "linear-regression";
        }
        return switch (model.trim().toLowerCase(Locale.US)) {
            case "moving-average",
                    "momentum",
                    "linear-regression",
                    "mean-reversion",
                    "exponential-smoothing",
                    "volatility-adjusted",
                    "breakout" -> model.trim().toLowerCase(Locale.US);
            default -> "linear-regression";
        };
    }

    private String predictionExplanation(String model) {
        return switch (model) {
            case "moving-average" -> "Uses the recent average price and a softened trend adjustment.";
            case "momentum" -> "Extends the recent daily price direction into the next month.";
            case "mean-reversion" -> "Pulls price toward its recent average while preserving a small trend component.";
            case "exponential-smoothing" -> "Weights the newest daily moves more heavily than older moves.";
            case "volatility-adjusted" -> "Projects the trend, then tempers it when daily price swings are wider.";
            case "breakout" -> "Leans into recent highs and the latest short-term trend.";
            default -> "Fits a simple line to recent prices and projects it forward.";
        };
    }
}
