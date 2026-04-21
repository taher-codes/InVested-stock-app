package com.stocksapp.dto;

import java.math.BigDecimal;

public record PricePointDto(String label, BigDecimal price, Long volume) {
}
