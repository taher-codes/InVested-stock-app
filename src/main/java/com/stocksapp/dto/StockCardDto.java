package com.stocksapp.dto;

import java.math.BigDecimal;

public record StockCardDto(
        String symbol,
        String companyName,
        String sector,
        BigDecimal currentPrice,
        BigDecimal changePercent,
        Long volume,
        Long marketCap
) {
}
