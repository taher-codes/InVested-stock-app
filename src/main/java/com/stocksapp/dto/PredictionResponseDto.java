package com.stocksapp.dto;

import java.util.List;

public record PredictionResponseDto(
        String symbol,
        String model,
        int months,
        String explanation,
        List<PricePointDto> history,
        List<PricePointDto> forecast
) {
}
