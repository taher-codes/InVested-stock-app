package com.stocksapp.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "stock_history")
public class StockHistory {

    @Id
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_id", nullable = false)
    private StockQuote stock;

    @Column(nullable = false)
    private LocalDate tradingDate;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal closePrice;

    @Column(nullable = false)
    private Long volume;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public StockQuote getStock() { return stock; }
    public void setStock(StockQuote stock) { this.stock = stock; }
    public LocalDate getTradingDate() { return tradingDate; }
    public void setTradingDate(LocalDate tradingDate) { this.tradingDate = tradingDate; }
    public BigDecimal getClosePrice() { return closePrice; }
    public void setClosePrice(BigDecimal closePrice) { this.closePrice = closePrice; }
    public Long getVolume() { return volume; }
    public void setVolume(Long volume) { this.volume = volume; }
}
