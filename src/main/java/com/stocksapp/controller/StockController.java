package com.stocksapp.controller;

import com.stocksapp.dto.AnalyticsDto;
import com.stocksapp.dto.DashboardSummaryDto;
import com.stocksapp.dto.PricePointDto;
import com.stocksapp.dto.PredictionResponseDto;
import com.stocksapp.dto.SectorAllocationDto;
import com.stocksapp.dto.StockCardDto;
import com.stocksapp.service.StockService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/stocks")
public class StockController {

    private final StockService stockService;

    public StockController(StockService stockService) {
        this.stockService = stockService;
    }

    @GetMapping
    public List<StockCardDto> getStocks() {
        return stockService.getStocks();
    }

    @GetMapping("/summary")
    public DashboardSummaryDto getSummary(@RequestParam(defaultValue = "AAPL") String symbol) {
        return stockService.getDashboardSummary(symbol);
    }

    @GetMapping("/series")
    public List<PricePointDto> getSeries(@RequestParam(defaultValue = "AAPL") String symbol) {
        return stockService.getPriceSeries(symbol);
    }

    @GetMapping("/top-movers")
    public List<StockCardDto> getTopMovers() {
        return stockService.getTopMovers();
    }

    @GetMapping("/sectors")
    public List<SectorAllocationDto> getSectors() {
        return stockService.getSectorAllocation();
    }

    @GetMapping("/analytics")
    public AnalyticsDto getAnalytics() {
        return stockService.getAnalytics();
    }

    @GetMapping("/prediction")
    public PredictionResponseDto getPrediction(
            @RequestParam(defaultValue = "AAPL") String symbol,
            @RequestParam(defaultValue = "linear-regression") String model,
            @RequestParam(defaultValue = "1") int months
    ) {
        return stockService.getPrediction(symbol, model, months);
    }
}
