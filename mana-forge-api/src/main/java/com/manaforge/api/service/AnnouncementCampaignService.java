package com.manaforge.api.service;

import com.manaforge.api.dto.AnnouncementDtos;
import com.manaforge.api.dto.FrontdeskDtos.PageResult;
import com.manaforge.api.model.mongo.AnnouncementCampaign;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.AnnouncementCampaignRepository;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AnnouncementCampaignService {
    private final AnnouncementCampaignRepository campaigns;
    private final AnnouncementDispatcher dispatcher;
    private final DirectusEmailTemplateService templates;

    public AnnouncementDtos.Campaign start(AnnouncementDtos.Send request, User operator) {
        if (request.subject().contains("\n") || request.subject().contains("\r")
                || (request.subject() + request.body()).matches("(?s).*\\{\\{[a-zA-Z0-9_.-]+}}.*")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid subject or unresolved macros");
        }
        if (request.templateId() != null && !"ANNOUNCEMENT".equals(templates.get(request.templateId()).category())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Announcement template required");
        }
        var existing = campaigns.findById(request.campaignId());
        if (existing.isPresent()) return replay(existing.get(), request, operator);
        AnnouncementCampaign campaign = new AnnouncementCampaign();
        campaign.setId(request.campaignId());
        campaign.setOperatorId(operator.getId());
        campaign.setRecipientIds(new LinkedHashSet<>(request.recipientIds()).stream().toList());
        campaign.setSubject(request.subject());
        campaign.setBody(request.body());
        campaign.setTemplateId(request.templateId());
        campaign.setCreatedAt(Instant.now());
        try { campaigns.insert(campaign); }
        catch (DuplicateKeyException exception) { return replay(campaigns.findById(request.campaignId()).orElseThrow(), request, operator); }
        try { dispatcher.dispatch(campaign, operator); }
        catch (org.springframework.core.task.TaskRejectedException exception) {
            campaign.setState(AnnouncementCampaign.State.FAILED);
            campaigns.save(campaign);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Announcement queue is full; check campaign history");
        }
        return AnnouncementDtos.view(campaign);
    }

    private AnnouncementDtos.Campaign replay(AnnouncementCampaign campaign, AnnouncementDtos.Send request, User operator) {
        if (!Objects.equals(campaign.getOperatorId(), operator.getId())
                || !Objects.equals(campaign.getSubject(), request.subject()) || !Objects.equals(campaign.getBody(), request.body())
                || !Objects.equals(campaign.getTemplateId(), request.templateId())
                || !new LinkedHashSet<>(campaign.getRecipientIds()).equals(new LinkedHashSet<>(request.recipientIds()))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Campaign ID already used for another request");
        }
        return AnnouncementDtos.view(campaign);
    }

    public AnnouncementDtos.Campaign get(String id) {
        return AnnouncementDtos.view(campaigns.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND)));
    }

    public PageResult<AnnouncementDtos.Campaign> list(int page, int size) {
        if (page < 0 || size < 1 || size > 100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        var result = campaigns.findAll(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id")));
        return new PageResult<>(result.stream().map(AnnouncementDtos::view).toList(), page, size, result.getTotalElements());
    }
}
