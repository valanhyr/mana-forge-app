package com.manaforge.api.service;

import com.manaforge.api.dto.FormatDetailDto;
import com.manaforge.api.dto.FormatSummaryDto;
import com.manaforge.api.model.directus.DirectusFormatData;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FormatServiceTest {

    @Mock
    private DirectusService directusService;

    @InjectMocks
    private FormatService formatService;

    private DirectusFormatData buildFormatData(String mongoId, String title) {
            DirectusFormatData data = new DirectusFormatData();
        data.setMongoId(mongoId);
        data.setTitle(title);
        data.setSubtitle("The classic format");
        data.setImageUrl("http://example.com/image.png");
        data.setSlug(title.toLowerCase());
        data.setSection(Collections.emptyList());
        return data;
    }

    @Test
    void getAllFormats_mapsTwoFormatsToSummaryDtos() throws Exception {
        DirectusFormatData f1 = buildFormatData("fmt1", "Premodern");
        DirectusFormatData f2 = buildFormatData("fmt2", "Classic");
        when(directusService.getFormats("es")).thenReturn(List.of(f1, f2));

        List<FormatSummaryDto> result = formatService.getAllFormats();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getMongoId()).isEqualTo("fmt1");
        assertThat(result.get(0).getTitle()).isEqualTo("Premodern");
        assertThat(result.get(1).getMongoId()).isEqualTo("fmt2");
    }

    @Test
    void getAllFormats_returnsEmptyListWhenDirectusServiceThrows() throws Exception {
        when(directusService.getFormats("es")).thenThrow(new RuntimeException("CMS down"));

        List<FormatSummaryDto> result = formatService.getAllFormats();

        assertThat(result).isEmpty();
    }

    @Test
    void getFormatByMongoId_returnsFormatDetailDtoWhenFound() throws Exception {
        DirectusFormatData data = buildFormatData("fmt1", "Premodern");
        data.setSection(Collections.emptyList());
        when(directusService.getFormatByMongoId("fmt1", "es")).thenReturn(data);

        FormatDetailDto result = formatService.getFormatByMongoId("fmt1");

        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo("Premodern");
        assertThat(result.getSlug()).isEqualTo("premodern");
    }

    @Test
    void getFormatByMongoId_returnsNullWhenStrapiReturnsNull() throws Exception {
        when(directusService.getFormatByMongoId("missing", "es")).thenReturn(null);

        FormatDetailDto result = formatService.getFormatByMongoId("missing");

        assertThat(result).isNull();
    }
}
