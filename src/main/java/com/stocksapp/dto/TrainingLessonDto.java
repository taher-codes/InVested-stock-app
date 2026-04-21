package com.stocksapp.dto;

import java.util.List;

public record TrainingLessonDto(
        String id,
        String title,
        String summary,
        String difficulty,
        List<String> concepts,
        String challengeQuestion,
        String riskHint
) {
}
