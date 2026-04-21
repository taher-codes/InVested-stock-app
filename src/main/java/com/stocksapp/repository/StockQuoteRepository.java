package com.stocksapp.repository;

import com.stocksapp.model.StockQuote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StockQuoteRepository extends JpaRepository<StockQuote, Long> {

    Optional<StockQuote> findBySymbolIgnoreCase(String symbol);

    List<StockQuote> findTop8ByOrderByMarketCapDesc();

    List<StockQuote> findAllByOrderByMarketCapDesc();
}
