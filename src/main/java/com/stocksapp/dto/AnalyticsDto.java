package com.stocksapp.dto;

import java.math.BigDecimal;
import java.util.List;

public record AnalyticsDto(
        List<String> symbols,
        List<BigDecimal> prices,
        List<BigDecimal> peRatios,
        List<Long> volumes
) {
}
