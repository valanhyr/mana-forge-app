package com.manaforge.api.service;

import com.manaforge.api.dto.AnnouncementDtos;
import com.manaforge.api.dto.FrontdeskDtos.EmailTemplate;
import com.manaforge.api.model.mongo.AnnouncementCampaign;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.AnnouncementCampaignRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AnnouncementCampaignServiceTest {
    private final AnnouncementCampaignRepository campaigns = mock(AnnouncementCampaignRepository.class);
    private final AnnouncementDispatcher dispatcher = mock(AnnouncementDispatcher.class);
    private final DirectusEmailTemplateService templates = mock(DirectusEmailTemplateService.class);
    private final AnnouncementCampaignService service = new AnnouncementCampaignService(campaigns, dispatcher, templates);
    private final AnnouncementDtos.Send request = new AnnouncementDtos.Send("d011e05b-f0aa-4af8-bacb-aa06347844e2", List.of("u1", "u1"), "Notice", "Body", null);

    private User operator() { User operator = new User(); operator.setId("op"); return operator; }

    @Test void persistedCampaignIdPreventsDuplicateDispatch() {
        User operator = operator();
        var result = service.start(request, operator);
        var captor = org.mockito.ArgumentCaptor.forClass(AnnouncementCampaign.class);
        verify(campaigns).insert(captor.capture());
        assertThat(captor.getValue().getRecipientIds()).containsExactly("u1");
        when(campaigns.findById(request.campaignId())).thenReturn(Optional.of(captor.getValue()));
        assertThat(service.start(request, operator).id()).isEqualTo(result.id());
        verify(dispatcher, times(1)).dispatch(any(), same(operator));
        var changed = new AnnouncementDtos.Send(request.campaignId(), List.of("u1"), "Different", "Body", null);
        assertThatThrownBy(() -> service.start(changed, operator)).isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatusCode().value()).isEqualTo(409));
    }

    @Test void invalidSubjectsAndMacrosCannotCreateACampaign() {
        for (var invalid : List.of(new AnnouncementDtos.Send(request.campaignId(), List.of("u1"), "Notice\r\nBcc: victim", "Body", null),
                new AnnouncementDtos.Send(request.campaignId(), List.of("u1"), "Notice", "Hi {{user.name}}", null))) {
            assertThatThrownBy(() -> service.start(invalid, operator())).isInstanceOf(ResponseStatusException.class);
        }
        verifyNoInteractions(campaigns, dispatcher);
    }

    @Test void onlyAnnouncementTemplatesAreAccepted() {
        when(templates.get("news")).thenReturn(new EmailTemplate("news", "News", "BROADCAST", "S", "B", List.of()));
        when(templates.get("notice")).thenReturn(new EmailTemplate("notice", "Notice", "ANNOUNCEMENT", "S", "B", List.of()));
        var wrong = new AnnouncementDtos.Send(request.campaignId(), List.of("u1"), "Notice", "Body", "news");
        assertThatThrownBy(() -> service.start(wrong, operator())).isInstanceOf(ResponseStatusException.class);
        verifyNoInteractions(campaigns, dispatcher);
        service.start(new AnnouncementDtos.Send(request.campaignId(), List.of("u1"), "Notice", "Body", "notice"), operator());
        verify(dispatcher).dispatch(any(), any());
    }

    @Test void fullExecutorQueueRecordsFailureWithoutRetryingDispatch() {
        doThrow(new org.springframework.core.task.TaskRejectedException("Full")).when(dispatcher).dispatch(any(), any());
        assertThatThrownBy(() -> service.start(request, operator())).isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatusCode().value()).isEqualTo(503));
        verify(campaigns).save(argThat(campaign -> campaign.getState() == AnnouncementCampaign.State.FAILED));
        verify(dispatcher, times(1)).dispatch(any(), any());
    }

    @Test void historyIsPagedAndBounded() {
        assertThatThrownBy(() -> service.list(0, 101)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> service.list(-1, 25)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> service.get("missing")).isInstanceOf(ResponseStatusException.class);
    }
}
