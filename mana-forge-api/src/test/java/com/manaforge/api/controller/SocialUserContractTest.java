package com.manaforge.api.controller;

import com.manaforge.api.model.mongo.*;
import com.manaforge.api.repository.*;
import com.manaforge.api.service.EmailEncryptionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.List;
import java.util.Optional;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class SocialUserContractTest {
    @AfterEach void clearContext() { SecurityContextHolder.clearContext(); }

    @Test void allSocialProjectionsExcludePrivateFieldsIncludingNestedUsers() throws Exception {
        var users = mock(UserRepository.class);
        var requests = mock(FriendRequestRepository.class);
        var follows = mock(FollowRepository.class);
        var messages = mock(MessageRepository.class);
        var encryption = mock(EmailEncryptionService.class);
        User me = new User(); me.setId("me"); me.setUsername("me"); me.setFriends(new String[]{"other"});
        User other = new User(); other.setId("other"); other.setUsername("other"); other.setEmail("encrypted");
        other.setPassword("secret"); other.setPendingEmail("pending"); other.setVerificationToken("token");
        when(users.findByUsername("me")).thenReturn(Optional.of(me));
        when(users.findById("other")).thenReturn(Optional.of(other));
        when(users.findAll()).thenReturn(List.of(me, other));
        when(users.findAllById(any())).thenReturn(List.of(other));
        when(encryption.decrypt("encrypted")).thenReturn("private@example.com");
        FriendRequest received = new FriendRequest("other", "me"); received.setId("r1");
        FriendRequest sent = new FriendRequest("me", "other"); sent.setId("r2");
        when(requests.findByReceiverIdAndStatus("me", "PENDING")).thenReturn(List.of(received));
        when(requests.findBySenderIdAndStatus("me", "PENDING")).thenReturn(List.of(sent));
        when(follows.findByFollowerId("me")).thenReturn(List.of(new Follow("me", "other")));
        when(follows.findByFollowingId("me")).thenReturn(List.of(new Follow("other", "me")));
        Message message = new Message("other", "me", "Hi"); message.setId("m1");
        when(messages.findAllByParticipant("me")).thenReturn(List.of(message));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("me", null, List.of()));
        var mvc = MockMvcBuilders.standaloneSetup(new FriendController(users, requests, encryption),
                new FollowController(users, follows, encryption), new MessageController(users, messages, encryption)).build();
        String[][] cases = {{"/api/friends", "$[0]"}, {"/api/friends/search?q=ot", "$[0]"},
                {"/api/friends/requests/received", "$[0].sender"}, {"/api/friends/requests/sent", "$[0].receiver"},
                {"/api/follows/following", "$[0]"}, {"/api/follows/followers", "$[0]"},
                {"/api/messages/conversations", "$[0].friend"}};
        for (var entry : cases) {
            var result = mvc.perform(get(entry[0])).andExpect(status().isOk())
                    .andExpect(jsonPath(entry[1] + ".userId").value("other"));
            for (String field : List.of("email", "friends", "password", "pendingEmail", "verificationToken",
                    "canChangeEmail", "newsletterSubscribed", "createdAt", "updatedAt", "lastLoginAt")) {
                result.andExpect(jsonPath(entry[1] + "." + field).doesNotExist());
            }
        }
        verify(encryption, never()).decrypt(any());
    }
}
