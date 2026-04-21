package com.stocksapp.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stocksapp.model.WatchlistItem;
import com.stocksapp.repository.StockQuoteRepository;
import com.stocksapp.repository.WatchlistItemRepository;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class WatchlistStorageService {

    private static final Logger logger = LoggerFactory.getLogger(WatchlistStorageService.class);

    private final WatchlistItemRepository watchlistItemRepository;
    private final StockQuoteRepository stockQuoteRepository;
    private final ObjectMapper objectMapper;
    private final Path storageFile;

    public WatchlistStorageService(
            WatchlistItemRepository watchlistItemRepository,
            StockQuoteRepository stockQuoteRepository,
            ObjectMapper objectMapper,
            @Value("${app.watchlist.storage-file}") String storageFile
    ) {
        this.watchlistItemRepository = watchlistItemRepository;
        this.stockQuoteRepository = stockQuoteRepository;
        this.objectMapper = objectMapper;
        this.storageFile = Path.of(storageFile);
    }

    @EventListener(ApplicationReadyEvent.class)
    public void restoreItems() {
        if (!Files.exists(storageFile) || watchlistItemRepository.count() > 0) {
            return;
        }

        try {
            List<StoredWatchlistItem> storedItems = objectMapper.readValue(
                    storageFile.toFile(),
                    new TypeReference<List<StoredWatchlistItem>>() {
                    }
            );
            for (StoredWatchlistItem storedItem : storedItems) {
                stockQuoteRepository.findBySymbolIgnoreCase(storedItem.symbol()).ifPresent(stock -> {
                    WatchlistItem item = new WatchlistItem();
                    item.setSymbol(stock.getSymbol());
                    item.setTargetPrice(storedItem.targetPrice());
                    item.setNotes(storedItem.notes());
                    item.setCreatedAt(storedItem.createdAt());
                    item.setUpdatedAt(storedItem.updatedAt());
                    watchlistItemRepository.save(item);
                });
            }
            logger.info("Restored {} watchlist item(s) from {}", storedItems.size(), storageFile);
        } catch (IOException ex) {
            logger.warn("Could not restore watchlist items from {}", storageFile, ex);
        }
    }

    public void persistItems() {
        try {
            Path parent = storageFile.getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            List<StoredWatchlistItem> storedItems = watchlistItemRepository.findAllByOrderByUpdatedAtDesc().stream()
                    .map(StoredWatchlistItem::fromEntity)
                    .toList();
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(storageFile.toFile(), storedItems);
        } catch (IOException ex) {
            logger.warn("Could not persist watchlist items to {}", storageFile, ex);
        }
    }

    @PreDestroy
    public void persistItemsBeforeShutdown() {
        persistItems();
    }

    private record StoredWatchlistItem(
            String symbol,
            BigDecimal targetPrice,
            String notes,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
        private static StoredWatchlistItem fromEntity(WatchlistItem item) {
            return new StoredWatchlistItem(
                    item.getSymbol(),
                    item.getTargetPrice(),
                    item.getNotes(),
                    item.getCreatedAt(),
                    item.getUpdatedAt()
            );
        }
    }
}
