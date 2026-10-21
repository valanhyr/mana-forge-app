package com.manaforge.api.service;

import com.manaforge.api.model.mongo.AnnouncementCampaign;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.AnnouncementCampaignRepository;
import com.manaforge.api.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AnnouncementDispatcherTest {
    private final AnnouncementCampaignRepository campaigns = mock(AnnouncementCampaignRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final FrontdeskAccessService access = mock(FrontdeskAccessService.class);
    private final FrontdeskEmailService emails = mock(FrontdeskEmailService.class);
    private final EmailEncryptionService encryption = mock(EmailEncryptionService.class);
    private final AnnouncementDispatcher dispatcher = new AnnouncementDispatcher(campaigns, users, access, emails, encryption);
    private final User operator = new User();

    private AnnouncementCampaign campaign(String... ids) {
        AnnouncementCampaign campaign = new AnnouncementCampaign(); campaign.setId("c1"); campaign.setSubject("Notice");
        campaign.setBody("Body"); campaign.setRecipientIds(List.of(ids));
        return campaign;
    }

    private User recipient(String id) {
        User user = new User(); user.setId(id); user.setUsername("customer-" + id); user.setEmail("enc-" + id); user.setValidated(true);
        when(users.findById(id)).thenReturn(Optional.of(user));
        when(encryption.decrypt("enc-" + id)).thenReturn(id + "@example.com");
        return user;
    }

    private void operatorAllowed() {
        operator.setId("op");
        when(users.findById("op")).thenReturn(Optional.of(operator)); when(access.isOperator(operator)).thenReturn(true);
    }

    @Test void sendsToEligibleUsersWithoutConsentWithServiceNoticeFooter() {
        operatorAllowed(); recipient("u1");
        var campaign = campaign("u1");
        dispatcher.dispatch(campaign, operator);
        assertThat(campaign.getSent()).isEqualTo(1);
        assertThat(campaign.getState()).isEqualTo(AnnouncementCampaign.State.COMPLETED);
        verify(emails).sendAnnouncement(argThat(request -> request.to().equals("u1@example.com")
                && request.body().startsWith("Body") && request.body().contains("service notice") && request.body().contains("aviso de servicio")),
                same(operator), eq("c1"));
        verifyNoMoreInteractions(emails);
    }

    @Test void ineligibleOrMissingRecipientsAreSkippedAndSmtpFailuresAreNotRetried() {
        operatorAllowed(); recipient("u1"); recipient("u3");
        User banned = recipient("u2"); banned.setStatus(User.AccountStatus.BANNED);
        when(users.findById("u4")).thenReturn(Optional.empty());
        when(emails.sendAnnouncement(argThat(request -> request != null && request.to().equals("u1@example.com")), any(), anyString()))
                .thenThrow(new RuntimeException("SMTP outcome unknown"));
        var campaign = campaign("u1", "u2", "u3", "u4");
        dispatcher.dispatch(campaign, operator);
        assertThat(campaign.getFailed()).isEqualTo(1);
        assertThat(campaign.getSkipped()).isEqualTo(2);
        assertThat(campaign.getSent()).isEqualTo(1);
        assertThat(campaign.getState()).isEqualTo(AnnouncementCampaign.State.COMPLETED);
        verify(emails, times(2)).sendAnnouncement(any(), same(operator), eq("c1"));
    }

    @Test void revokedOperatorStopsTheCampaignWithoutSending() {
        operator.setId("op");
        when(users.findById("op")).thenReturn(Optional.of(operator)); when(access.isOperator(operator)).thenReturn(false);
        recipient("u1");
        var campaign = campaign("u1");
        dispatcher.dispatch(campaign, operator);
        assertThat(campaign.getState()).isEqualTo(AnnouncementCampaign.State.FAILED);
        assertThat(campaign.getSent()).isZero();
        verifyNoInteractions(emails);
    }
}
