package com.stocksapp.repository;

import com.stocksapp.model.WatchlistItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WatchlistItemRepository extends JpaRepository<WatchlistItem, Long> {

    List<WatchlistItem> findAllByOrderByUpdatedAtDesc();
}
