package com.stocksapp.service;

import com.stocksapp.dto.WatchlistItemDto;
import com.stocksapp.dto.WatchlistItemRequestDto;
import com.stocksapp.model.StockQuote;
import com.stocksapp.model.WatchlistItem;
import com.stocksapp.repository.StockQuoteRepository;
import com.stocksapp.repository.WatchlistItemRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
public class WatchlistService {

    private final WatchlistItemRepository watchlistItemRepository;
    private final StockQuoteRepository stockQuoteRepository;
    private final WatchlistStorageService watchlistStorageService;

    public WatchlistService(
            WatchlistItemRepository watchlistItemRepository,
            StockQuoteRepository stockQuoteRepository,
            WatchlistStorageService watchlistStorageService
    ) {
        this.watchlistItemRepository = watchlistItemRepository;
        this.stockQuoteRepository = stockQuoteRepository;
        this.watchlistStorageService = watchlistStorageService;
    }

    public List<WatchlistItemDto> getItems() {
        return watchlistItemRepository.findAllByOrderByUpdatedAtDesc().stream()
                .map(this::toDto)
                .toList();
    }

    public WatchlistItemDto createItem(WatchlistItemRequestDto request) {
        StockQuote stock = getStock(request.symbol());
        WatchlistItem item = new WatchlistItem();
        LocalDateTime now = LocalDateTime.now();
        item.setSymbol(stock.getSymbol());
        item.setTargetPrice(cleanTargetPrice(request.targetPrice()));
        item.setNotes(cleanNotes(request.notes()));
        item.setCreatedAt(now);
        item.setUpdatedAt(now);
        WatchlistItem savedItem = watchlistItemRepository.save(item);
        watchlistStorageService.persistItems();
        return toDto(savedItem);
    }

    public WatchlistItemDto updateItem(Long id, WatchlistItemRequestDto request) {
        WatchlistItem item = watchlistItemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Watchlist item not found"));
        StockQuote stock = getStock(request.symbol());
        item.setSymbol(stock.getSymbol());
        item.setTargetPrice(cleanTargetPrice(request.targetPrice()));
        item.setNotes(cleanNotes(request.notes()));
        item.setUpdatedAt(LocalDateTime.now());
        WatchlistItem savedItem = watchlistItemRepository.save(item);
        watchlistStorageService.persistItems();
        return toDto(savedItem);
    }

    public void deleteItem(Long id) {
        if (!watchlistItemRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Watchlist item not found");
        }
        watchlistItemRepository.deleteById(id);
        watchlistStorageService.persistItems();
    }

    private StockQuote getStock(String symbol) {
        String normalized = symbol == null ? "" : symbol.trim().toUpperCase(Locale.US);
        if (normalized.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Symbol is required");
        }
        return stockQuoteRepository.findBySymbolIgnoreCase(normalized)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown stock symbol"));
    }

    private BigDecimal cleanTargetPrice(BigDecimal targetPrice) {
        if (targetPrice == null || targetPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Target price must be greater than zero");
        }
        return targetPrice.setScale(2, RoundingMode.HALF_UP);
    }

    private String cleanNotes(String notes) {
        String cleaned = notes == null ? "" : notes.trim();
        if (cleaned.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Research note is required");
        }
        return cleaned.length() > 280 ? cleaned.substring(0, 280) : cleaned;
    }

    private WatchlistItemDto toDto(WatchlistItem item) {
        StockQuote stock = stockQuoteRepository.findBySymbolIgnoreCase(item.getSymbol())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Watchlist stock missing"));
        return new WatchlistItemDto(
                item.getId(),
                stock.getSymbol(),
                stock.getCompanyName(),
                stock.getCurrentPrice(),
                item.getTargetPrice(),
                calculateChangePercent(stock),
                item.getNotes(),
                item.getCreatedAt(),
                item.getUpdatedAt()
        );
    }

    private BigDecimal calculateChangePercent(StockQuote stock) {
        if (stock.getPreviousClose() == null || BigDecimal.ZERO.compareTo(stock.getPreviousClose()) == 0) {
            return BigDecimal.ZERO;
        }
        return stock.getCurrentPrice().subtract(stock.getPreviousClose())
                .multiply(BigDecimal.valueOf(100))
                .divide(stock.getPreviousClose(), 2, RoundingMode.HALF_UP);
    }
}
