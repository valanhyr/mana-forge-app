package com.manaforge.api.controller;

import com.manaforge.api.model.mongo.Feedback;
import com.manaforge.api.repository.FeedbackRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/feedback")
public class FeedbackController {

    private static final Logger log = LoggerFactory.getLogger(FeedbackController.class);
    private final FeedbackRepository feedbackRepository;

    public FeedbackController(FeedbackRepository feedbackRepository) {
        this.feedbackRepository = feedbackRepository;
    }

    @PostMapping
    public ResponseEntity<Void> submit(@RequestBody Feedback feedback, HttpServletRequest request) {
        feedback.setUserAgent(request.getHeader("User-Agent"));
        feedbackRepository.save(feedback);
        log.info("Feedback received — category: {} anonymous: {}", feedback.getCategory(), feedback.getEmail() == null);
        return ResponseEntity.ok().build();
    }
}
