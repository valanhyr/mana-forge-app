package com.manaforge.api.service;

import com.manaforge.api.model.mongo.NewsletterCampaign;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.NewsletterCampaignRepository;
import com.manaforge.api.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class NewsletterDispatcherTest {
    @Test void withdrawnConsentIsSkippedAndSmtpFailuresAreNotRetried() {
        var campaigns = mock(NewsletterCampaignRepository.class);
        var users = mock(UserRepository.class);
        var newsletter = mock(NewsletterService.class);
        var access = mock(FrontdeskAccessService.class);
        var emails = mock(FrontdeskEmailService.class);
        var encryption = mock(EmailEncryptionService.class);
        var dispatcher = new NewsletterDispatcher(campaigns, users, newsletter, access, emails, encryption);
        User operator = new User(); operator.setId("op");
        when(users.findById("op")).thenReturn(Optional.of(operator)); when(access.isOperator(operator)).thenReturn(true);
        User allowed = new User(); allowed.setId("u1"); allowed.setUsername("customer"); allowed.setEmail("encrypted");
        allowed.setValidated(true); allowed.setNewsletterSubscribed(true); allowed.setNewsletterTokenEncrypted("token");
        when(users.findById("u1")).thenReturn(Optional.of(allowed));
        User withdrawn = new User(); withdrawn.setValidated(true); withdrawn.setNewsletterSubscribed(false);
        when(users.findById("u2")).thenReturn(Optional.of(withdrawn));
        when(encryption.decrypt("encrypted")).thenReturn("customer@example.com");
        when(newsletter.unsubscribeUrl(allowed)).thenReturn("https://example.com/newsletter/unsubscribe#token");
        when(emails.sendNewsletter(any(), any(), anyString(), anyString())).thenThrow(new RuntimeException("SMTP outcome unknown"));
        NewsletterCampaign campaign = new NewsletterCampaign(); campaign.setId("c1"); campaign.setSubject("News"); campaign.setBody("Body");
        campaign.setRecipientIds(List.of("u1", "u2"));
        dispatcher.dispatch(campaign, operator);
        assertThat(campaign.getFailed()).isEqualTo(1); assertThat(campaign.getSkipped()).isEqualTo(1);
        assertThat(campaign.getState()).isEqualTo(NewsletterCampaign.State.COMPLETED);
        verify(emails, times(1)).sendNewsletter(argThat(request -> request.body().contains("Unsubscribe / Darme de baja:")), same(operator), anyString(), eq("c1"));
    }
}
