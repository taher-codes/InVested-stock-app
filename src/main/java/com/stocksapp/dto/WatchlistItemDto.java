package com.stocksapp.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record WatchlistItemDto(
        Long id,
        String symbol,
        String companyName,
        BigDecimal currentPrice,
        BigDecimal targetPrice,
        BigDecimal changePercent,
        String notes,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
