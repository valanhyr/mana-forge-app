package com.manaforge.api.service;

import com.manaforge.api.dto.NewsletterDtos;
import com.manaforge.api.model.mongo.NewsletterCampaign;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.NewsletterCampaignRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class NewsletterCampaignServiceTest {
    private final NewsletterCampaignRepository campaigns = mock(NewsletterCampaignRepository.class);
    private final NewsletterDispatcher dispatcher = mock(NewsletterDispatcher.class);
    private final DirectusEmailTemplateService templates = mock(DirectusEmailTemplateService.class);
    private final NewsletterCampaignService service = new NewsletterCampaignService(campaigns, dispatcher, templates);
    private final NewsletterDtos.Send request = new NewsletterDtos.Send("d011e05b-f0aa-4af8-bacb-aa06347844e2", List.of("u1", "u1"), "News", "Body", null);

    @Test void persistedCampaignIdPreventsDuplicateDispatch() {
        User operator = new User(); operator.setId("op");
        var result = service.start(request, operator);
        var captor = org.mockito.ArgumentCaptor.forClass(NewsletterCampaign.class);
        verify(campaigns).insert(captor.capture());
        assertThat(captor.getValue().getRecipientIds()).containsExactly("u1");
        when(campaigns.findById(request.campaignId())).thenReturn(Optional.of(captor.getValue()));
        assertThat(service.start(request, operator).id()).isEqualTo(result.id());
        verify(dispatcher, times(1)).dispatch(any(), same(operator));
        var changed = new NewsletterDtos.Send(request.campaignId(), List.of("u1"), "Different news", "Body", null);
        assertThatThrownBy(() -> service.start(changed, operator)).isInstanceOf(ResponseStatusException.class);
    }

    @Test void invalidSubjectsAndMacrosCannotCreateACampaign() {
        User operator = new User(); operator.setId("op");
        for (var invalid : List.of(new NewsletterDtos.Send(request.campaignId(), List.of("u1"), "News\r\nBcc: victim", "Body", null),
                new NewsletterDtos.Send(request.campaignId(), List.of("u1"), "News", "Hi {{user.name}}", null))) {
            assertThatThrownBy(() -> service.start(invalid, operator)).isInstanceOf(ResponseStatusException.class);
        }
        verifyNoInteractions(campaigns, dispatcher);
    }

    @Test void fullExecutorQueueRecordsFailureWithoutRetryingDispatch() {
        User operator = new User(); operator.setId("op");
        doThrow(new org.springframework.core.task.TaskRejectedException("Full")).when(dispatcher).dispatch(any(), any());
        assertThatThrownBy(() -> service.start(request, operator)).isInstanceOf(ResponseStatusException.class);
        verify(campaigns).save(argThat(campaign -> campaign.getState() == NewsletterCampaign.State.FAILED));
        verify(dispatcher, times(1)).dispatch(any(), any());
    }
}
