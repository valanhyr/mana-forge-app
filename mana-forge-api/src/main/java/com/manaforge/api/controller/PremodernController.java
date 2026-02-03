package com.manaforge.api.controller;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.manaforge.api.service.PremodernService;

@RestController
@RequestMapping("/api/premodern")
public class PremodernController {

    private final PremodernService premodernService;

    public PremodernController(PremodernService premodernService) {
        this.premodernService = premodernService;
    }

    @GetMapping("/banned-cards")
    public List<Map<String, Object>> getBannedCards() {
        return premodernService.getBannedCards();
    }
}