package com.stocksapp.dto;

import java.math.BigDecimal;

public record WatchlistItemRequestDto(
        String symbol,
        BigDecimal targetPrice,
        String notes
) {
}
