package com.manaforge.api.service;

import com.manaforge.api.dto.FormatDetailDto;
import com.manaforge.api.dto.FormatSummaryDto;
import com.manaforge.api.model.strapi.StrapiFormatData;
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
    private StrapiService strapiService;

    @InjectMocks
    private FormatService formatService;

    private StrapiFormatData buildFormatData(String mongoId, String title) {
        StrapiFormatData data = new StrapiFormatData();
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
        StrapiFormatData f1 = buildFormatData("fmt1", "Premodern");
        StrapiFormatData f2 = buildFormatData("fmt2", "Classic");
        when(strapiService.getFormats("es")).thenReturn(List.of(f1, f2));

        List<FormatSummaryDto> result = formatService.getAllFormats();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getMongoId()).isEqualTo("fmt1");
        assertThat(result.get(0).getTitle()).isEqualTo("Premodern");
        assertThat(result.get(1).getMongoId()).isEqualTo("fmt2");
    }

    @Test
    void getAllFormats_returnsEmptyListWhenStrapiServiceThrows() throws Exception {
        when(strapiService.getFormats("es")).thenThrow(new RuntimeException("Strapi down"));

        List<FormatSummaryDto> result = formatService.getAllFormats();

        assertThat(result).isEmpty();
    }

    @Test
    void getFormatByMongoId_returnsFormatDetailDtoWhenFound() throws Exception {
        StrapiFormatData data = buildFormatData("fmt1", "Premodern");
        data.setSection(Collections.emptyList());
        when(strapiService.getFormatByMongoId("fmt1", "es")).thenReturn(data);

        FormatDetailDto result = formatService.getFormatByMongoId("fmt1");

        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo("Premodern");
        assertThat(result.getSlug()).isEqualTo("premodern");
    }

    @Test
    void getFormatByMongoId_returnsNullWhenStrapiReturnsNull() throws Exception {
        when(strapiService.getFormatByMongoId("missing", "es")).thenReturn(null);

        FormatDetailDto result = formatService.getFormatByMongoId("missing");

        assertThat(result).isNull();
    }
}
