package com.manaforge.api.model.directus;

import java.util.List;

public record FaqTopic(String id, String title, List<FaqQuestion> questions) {
    public record FaqQuestion(String id, String question, String answer) {}
}
