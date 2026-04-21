package com.stocksapp.dto;

import java.math.BigDecimal;

public record DashboardSummaryDto(
        String trackedSymbol,
        String companyName,
        BigDecimal currentPrice,
        BigDecimal changePercent,
        String marketStatus,
        Long volume,
        BigDecimal peRatio
) {
}
