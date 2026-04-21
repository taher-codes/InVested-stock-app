package com.stocksapp.repository;

import com.stocksapp.model.StockHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StockHistoryRepository extends JpaRepository<StockHistory, Long> {

    List<StockHistory> findByStockSymbolIgnoreCaseOrderByTradingDateAsc(String symbol);
}
