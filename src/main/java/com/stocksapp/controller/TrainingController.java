package com.stocksapp.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.stocksapp.dto.TrainingLessonDto;
import com.stocksapp.service.TrainingService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/training")
public class TrainingController {

    private final TrainingService trainingService;

    public TrainingController(TrainingService trainingService) {
        this.trainingService = trainingService;
    }

    @GetMapping("/lessons")
    public List<TrainingLessonDto> getLessons() {
        return trainingService.getLessons();
    }

    @GetMapping("/live-company")
    public JsonNode getLiveCompany(@RequestParam String symbol) {
        return trainingService.getLiveCompany(symbol);
    }
}
