package com.stocksapp.controller;

import com.stocksapp.dto.WatchlistItemDto;
import com.stocksapp.dto.WatchlistItemRequestDto;
import com.stocksapp.service.WatchlistService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/watchlist")
public class WatchlistController {

    private final WatchlistService watchlistService;

    public WatchlistController(WatchlistService watchlistService) {
        this.watchlistService = watchlistService;
    }

    @GetMapping
    public List<WatchlistItemDto> getItems() {
        return watchlistService.getItems();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WatchlistItemDto createItem(@RequestBody WatchlistItemRequestDto request) {
        return watchlistService.createItem(request);
    }

    @PutMapping("/{id}")
    public WatchlistItemDto updateItem(@PathVariable Long id, @RequestBody WatchlistItemRequestDto request) {
        return watchlistService.updateItem(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteItem(@PathVariable Long id) {
        watchlistService.deleteItem(id);
    }
}
