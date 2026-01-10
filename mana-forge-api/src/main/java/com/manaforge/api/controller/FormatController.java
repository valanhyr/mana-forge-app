package com.manaforge.api.controller;

import com.manaforge.api.dto.FormatDetailDto;
import com.manaforge.api.dto.FormatSummaryDto;
import com.manaforge.api.model.mongo.Format;
import com.manaforge.api.repository.FormatRepository;
import com.manaforge.api.service.FormatService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/formats")
public class FormatController {

    private final FormatRepository formatRepository;
    private final FormatService formatService;

    public FormatController(FormatRepository formatRepository, FormatService formatService) {
        this.formatRepository = formatRepository;
        this.formatService = formatService;
    }

    @GetMapping("/active")
    public List<Format> getActiveFormats() {
        return formatRepository.findByIsActiveTrue();
    }

    @GetMapping
    public ResponseEntity<List<FormatSummaryDto>> getAllFormats() {
        return ResponseEntity.ok(formatService.getAllFormats());
    }

    @GetMapping("/{mongoId}")
    public ResponseEntity<FormatDetailDto> getFormatById(@PathVariable String mongoId) {
        FormatDetailDto format = formatService.getFormatByMongoId(mongoId);
        if (format == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(format);
    }
}