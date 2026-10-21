package com.manaforge.api.service;

import com.manaforge.api.dto.FrontdeskDtos.SendEmail;
import com.manaforge.api.model.mongo.NewsletterCampaign;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.NewsletterCampaignRepository;
import com.manaforge.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/** Persisted intent, one attempt only. Interrupted campaigns must be reconciled, never auto-replayed. */
@Service
@RequiredArgsConstructor
public class NewsletterDispatcher {
    private final NewsletterCampaignRepository campaigns;
    private final UserRepository users;
    private final NewsletterService newsletter;
    private final FrontdeskAccessService access;
    private final FrontdeskEmailService emails;
    private final EmailEncryptionService encryption;

    @Async("newsletterExecutor")
    public void dispatch(NewsletterCampaign campaign, User operator) {
        try {
            for (String id : campaign.getRecipientIds()) {
                // Reload both permissions and consent, including withdrawals after selection.
                User currentOperator = users.findById(operator.getId()).orElse(null);
                if (!access.isOperator(currentOperator)) throw new IllegalStateException("Operator access revoked");
                User recipient = users.findById(id).orElse(null);
                if (!NewsletterService.eligible(recipient)) {
                    campaign.setSkipped(campaign.getSkipped() + 1);
                } else {
                    try {
                        String url = newsletter.unsubscribeUrl(recipient);
                        String body = campaign.getBody() + "\n\nUnsubscribe / Darme de baja: " + url;
                        emails.sendNewsletter(new SendEmail(encryption.decrypt(recipient.getEmail()), recipient.getUsername(),
                                campaign.getSubject(), body, campaign.getTemplateId(), null), currentOperator, url, campaign.getId());
                        campaign.setSent(campaign.getSent() + 1);
                    } catch (Exception exception) {
                        // SMTP can have accepted a message before a failure: never retry it here.
                        campaign.setFailed(campaign.getFailed() + 1);
                    }
                }
                campaigns.save(campaign);
            }
            campaign.setState(NewsletterCampaign.State.COMPLETED);
        } catch (Exception exception) {
            campaign.setState(NewsletterCampaign.State.FAILED);
        }
        campaigns.save(campaign);
    }
}
