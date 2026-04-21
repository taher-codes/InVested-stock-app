package com.stocksapp.dto;

import java.math.BigDecimal;

public record SectorAllocationDto(String sector, long companies, BigDecimal averagePrice) {
}
