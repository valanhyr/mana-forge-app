package com.manaforge.api.model.mongo;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Document(collection = "feedback")
public class Feedback {

    public enum Category { AI, FEATURE, BUG, SUGGESTION, UI, OTHER }

    @Id
    private String id;
    private Category category;
    private String summary;
    private String description;
    private String email;        // null = anonymous
    private String userAgent;
    private LocalDateTime createdAt = LocalDateTime.now();
}
