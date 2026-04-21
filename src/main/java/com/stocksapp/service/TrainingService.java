package com.stocksapp.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stocksapp.dto.TrainingLessonDto;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;
import static org.springframework.http.HttpStatus.GATEWAY_TIMEOUT;
import static org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR;

@Service
public class TrainingService {

    private static final long LIVE_FETCH_TIMEOUT_SECONDS = 45;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<TrainingLessonDto> getLessons() {
        return List.of(
                new TrainingLessonDto(
                        "valuation-basics",
                        "Valuation Basics",
                        "Learn how price, earnings, and expectations connect before you buy a stock.",
                        "Beginner",
                        List.of("P/E ratio", "growth", "margin of safety"),
                        "A stock has a low P/E but shrinking revenue. What extra evidence would you want before buying?",
                        "Cheap stocks can stay cheap when the business quality is falling."
                ),
                new TrainingLessonDto(
                        "risk-and-sizing",
                        "Risk And Position Sizing",
                        "Practice deciding how much capital to risk on a single position.",
                        "Intermediate",
                        List.of("diversification", "position sizing", "drawdown"),
                        "If you only want to risk 2% of your portfolio on one trade, how does that limit your position size?",
                        "A good idea can still hurt a portfolio when the position is too large."
                ),
                new TrainingLessonDto(
                        "trend-vs-value",
                        "Trend Vs Value",
                        "Compare momentum signals with valuation signals and decide when they disagree.",
                        "Intermediate",
                        List.of("momentum", "trend", "reversion"),
                        "Would you buy a fast-rising stock with rich valuation if earnings revisions are still improving?",
                        "Strong trends can reverse quickly when the story changes."
                )
        );
    }

    public JsonNode getLiveCompany(String symbol) {
        String normalizedSymbol = normalizeSymbol(symbol);
        String responseBody = runLiveFetch(normalizedSymbol);

        try {
            return objectMapper.readTree(responseBody);
        } catch (IOException exception) {
            throw new ResponseStatusException(BAD_GATEWAY, "Live Yahoo data returned invalid JSON.", exception);
        }
    }

    private String runLiveFetch(String symbol) {
        Path scriptPath = Paths.get("tools", "yfinance_live_company.py").toAbsolutePath().normalize();
        if (!Files.exists(scriptPath)) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR, "The live Yahoo Finance helper script is missing.");
        }

        List<List<String>> candidateCommands = List.of(
                List.of("python", scriptPath.toString(), "--symbol", symbol),
                List.of("py", "-3", scriptPath.toString(), "--symbol", symbol)
        );

        IOException startupFailure = null;

        for (List<String> command : candidateCommands) {
            Process process;
            try {
                process = new ProcessBuilder(command)
                        .directory(Paths.get("").toAbsolutePath().toFile())
                        .redirectErrorStream(true)
                        .start();
            } catch (IOException exception) {
                startupFailure = exception;
                continue;
            }

            try {
                boolean finished = process.waitFor(LIVE_FETCH_TIMEOUT_SECONDS, TimeUnit.SECONDS);
                if (!finished) {
                    process.destroyForcibly();
                    throw new ResponseStatusException(GATEWAY_TIMEOUT, "Live Yahoo Finance data timed out.");
                }

                String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8).trim();
                if (process.exitValue() != 0) {
                    throw new ResponseStatusException(
                            BAD_GATEWAY,
                            output.isBlank() ? "Live Yahoo Finance data could not be loaded." : output
                    );
                }

                return output;
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new ResponseStatusException(INTERNAL_SERVER_ERROR, "Live Yahoo Finance loading was interrupted.", exception);
            } catch (IOException exception) {
                throw new ResponseStatusException(BAD_GATEWAY, "Could not read the live Yahoo Finance response.", exception);
            }
        }

        throw new ResponseStatusException(INTERNAL_SERVER_ERROR, "Python could not be started for live Yahoo Finance requests.", startupFailure);
    }

    private String normalizeSymbol(String symbol) {
        if (symbol == null || symbol.isBlank()) {
            return "AAPL";
        }
        return symbol.trim().toUpperCase(Locale.US).replace(".", "-");
    }
}
