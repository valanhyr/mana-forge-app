package com.manaforge.api.controller;

import com.manaforge.api.model.mongo.Format;
import com.manaforge.api.repository.FormatRepository;
import org.springframework.web.bind.annotation.*;
import java.util.List;


@RestController
@RequestMapping("/api/formats")
public class FormatController {
    
    private final FormatRepository formatRepository;

    public FormatController(FormatRepository formatRepository) {
        this.formatRepository = formatRepository;
    }

    @GetMapping("/active")
    public List<Format> getActiveFormats() {
        return formatRepository.findByIsActiveTrue();
    }
}