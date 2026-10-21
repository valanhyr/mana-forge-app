package com.manaforge.api.service;

import com.manaforge.api.dto.FrontdeskDtos.SendEmail;
import com.manaforge.api.model.mongo.AnnouncementCampaign;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.AnnouncementCampaignRepository;
import com.manaforge.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/** Persisted intent, one attempt only. Interrupted campaigns must be reconciled, never auto-replayed. */
@Service
@RequiredArgsConstructor
public class AnnouncementDispatcher {
    static final String FOOTER = "\n\n--\nThis is a service notice, not a newsletter. / Este es un aviso de servicio, no una newsletter.";

    private final AnnouncementCampaignRepository campaigns;
    private final UserRepository users;
    private final FrontdeskAccessService access;
    private final FrontdeskEmailService emails;
    private final EmailEncryptionService encryption;

    // Shares the single-worker executor: SMTP stays serialized across newsletters and announcements.
    @Async("newsletterExecutor")
    public void dispatch(AnnouncementCampaign campaign, User operator) {
        try {
            for (String id : campaign.getRecipientIds()) {
                User currentOperator = users.findById(operator.getId()).orElse(null);
                if (!access.isOperator(currentOperator)) throw new IllegalStateException("Operator access revoked");
                User recipient = users.findById(id).orElse(null);
                if (!AnnouncementService.eligible(recipient)) {
                    campaign.setSkipped(campaign.getSkipped() + 1);
                } else {
                    try {
                        emails.sendAnnouncement(new SendEmail(encryption.decrypt(recipient.getEmail()), recipient.getUsername(),
                                campaign.getSubject(), campaign.getBody() + FOOTER, campaign.getTemplateId(), null),
                                currentOperator, campaign.getId());
                        campaign.setSent(campaign.getSent() + 1);
                    } catch (Exception exception) {
                        // SMTP can have accepted a message before a failure: never retry it here.
                        campaign.setFailed(campaign.getFailed() + 1);
                    }
                }
                campaigns.save(campaign);
            }
            campaign.setState(AnnouncementCampaign.State.COMPLETED);
        } catch (Exception exception) {
            campaign.setState(AnnouncementCampaign.State.FAILED);
        }
        campaigns.save(campaign);
    }
}
