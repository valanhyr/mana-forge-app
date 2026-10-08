package com.manaforge.api.dto;

import com.manaforge.api.model.mongo.NewsletterCampaign;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public final class NewsletterDtos {
    private NewsletterDtos() {}
    public record Send(@NotBlank @Pattern(regexp = "[a-fA-F0-9-]{36}") String campaignId,
                       @NotEmpty @Size(max = 100) List<@NotBlank @Size(max = 100) String> recipientIds,
                       @NotBlank @Size(max = 200) String subject,
                       @NotBlank @Size(max = 50000) String body, @Size(max = 100) String templateId) {}
    public record Campaign(String id, NewsletterCampaign.State state, int total, int sent, int failed, int skipped) {}
    public static Campaign view(NewsletterCampaign campaign) {
        return new Campaign(campaign.getId(), campaign.getState(), campaign.getRecipientIds().size(),
                campaign.getSent(), campaign.getFailed(), campaign.getSkipped());
    }
}
