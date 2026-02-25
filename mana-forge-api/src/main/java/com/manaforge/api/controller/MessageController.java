package com.manaforge.api.controller;

import com.manaforge.api.dto.UserDto;
import com.manaforge.api.model.mongo.Message;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.MessageRepository;
import com.manaforge.api.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final UserRepository userRepository;
    private final MessageRepository messageRepository;

    public MessageController(UserRepository userRepository, MessageRepository messageRepository) {
        this.userRepository = userRepository;
        this.messageRepository = messageRepository;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private User getAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        String identifier = auth.getPrincipal() instanceof OAuth2User oAuth2User
                ? oAuth2User.getAttribute("email")
                : auth.getPrincipal().toString();
        return userRepository.findByUsername(identifier)
                .or(() -> userRepository.findByEmail(identifier))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    private boolean canChat(User me, String otherId) {
        // Amistad bidireccional: cualquiera de los dos tiene al otro en su lista
        boolean iInFriends = me.getFriends() != null && Arrays.asList(me.getFriends()).contains(otherId);
        if (iInFriends) return true;
        return userRepository.findById(otherId)
                .map(other -> other.getFriends() != null && Arrays.asList(other.getFriends()).contains(me.getId()))
                .orElse(false);
    }

    private Map<String, Object> toMessageDto(Message m) {
        return Map.of(
                "id", m.getId(),
                "senderId", m.getSenderId(),
                "receiverId", m.getReceiverId(),
                "content", m.getContent(),
                "createdAt", m.getCreatedAt().toString(),
                "read", m.getReadAt() != null
        );
    }

    private List<Message> findConversation(String userAId, String userBId) {
        return java.util.stream.Stream.concat(
                messageRepository.findBySenderIdAndReceiverId(userAId, userBId).stream(),
                messageRepository.findBySenderIdAndReceiverId(userBId, userAId).stream()
        ).collect(Collectors.toList());
    }

    // ── Endpoints ────────────────────────────────────────────────────────────

    /** Lista de conversaciones: último mensaje por cada peer (enviado o recibido) */
    @GetMapping("/conversations")
    public ResponseEntity<List<Map<String, Object>>> getConversations() {
        User me = getAuthenticatedUser();
        String myId = me.getId();

        // 1 SOLA query: todos los mensajes donde participo (sender o receiver)
        List<Message> allMyMessages = messageRepository.findAllByParticipant(myId);

        // Agrupar en memoria por peerId
        Map<String, List<Message>> byPeer = allMyMessages.stream().collect(
                Collectors.groupingBy(m -> m.getSenderId().equals(myId) ? m.getReceiverId() : m.getSenderId())
        );

        // También incluir amigos sin mensajes aún
        java.util.Set<String> peerIds = new java.util.LinkedHashSet<>(byPeer.keySet());
        if (me.getFriends() != null) peerIds.addAll(Arrays.asList(me.getFriends()));

        List<Map<String, Object>> conversations = peerIds.stream().map(peerId -> {
            List<Message> msgs = byPeer.getOrDefault(peerId, List.of());
            if (msgs.isEmpty()) return null; // amigo sin mensajes → no mostrar aún
            Message last = msgs.stream()
                    .max(Comparator.comparing(Message::getCreatedAt))
                    .orElse(null);
            long unread = msgs.stream()
                    .filter(m -> m.getReceiverId().equals(myId) && m.getReadAt() == null)
                    .count();
            // 1 query por peer para obtener info del usuario (sólo los peers que tienen mensajes)
            UserDto friend = userRepository.findById(peerId).map(u -> UserDto.builder()
                    .userId(u.getId()).name(u.getName()).username(u.getUsername())
                    .email(u.getEmail()).biography(u.getBiography()).build()).orElse(null);

            if (friend == null) return null;

            return Map.<String, Object>of(
                    "friendId", peerId,
                    "friend", friend,
                    "lastMessage", last != null ? toMessageDto(last) : Map.of(),
                    "unreadCount", unread,
                    "lastMessageAt", last != null ? last.getCreatedAt().toString() : ""
            );
        }).filter(c -> c != null).collect(Collectors.toList());

        conversations.sort(Comparator.comparing(
                c -> (String) c.get("lastMessageAt"), Comparator.reverseOrder()
        ));

        return ResponseEntity.ok(conversations);
    }


    /** Conversación completa con un amigo */
    @GetMapping("/{friendId}")
    public ResponseEntity<List<Map<String, Object>>> getConversation(@PathVariable String friendId) {
        User me = getAuthenticatedUser();
        if (!canChat(me, friendId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not friends");
        }
        List<Map<String, Object>> messages = findConversation(me.getId(), friendId)
                .stream()
                .sorted(Comparator.comparing(Message::getCreatedAt))
                .map(this::toMessageDto)
                .toList();
        return ResponseEntity.ok(messages);
    }

    /** Enviar mensaje a un amigo */
    @PostMapping("/{friendId}")
    public ResponseEntity<Map<String, Object>> sendMessage(
            @PathVariable String friendId,
            @RequestBody Map<String, String> body) {
        User me = getAuthenticatedUser();
        if (!canChat(me, friendId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not friends");
        }
        String content = body.get("content");
        if (content == null || content.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Content cannot be empty");
        }
        Message saved = messageRepository.save(new Message(me.getId(), friendId, content.trim()));
        return ResponseEntity.status(HttpStatus.CREATED).body(toMessageDto(saved));
    }

    /** Marcar todos los mensajes de un amigo como leídos */
    @PutMapping("/{friendId}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable String friendId) {
        User me = getAuthenticatedUser();
        // Solo marca como leídos los mensajes donde YO soy el receptor
        List<Message> unread = messageRepository.findBySenderIdAndReceiverId(friendId, me.getId())
                .stream()
                .filter(m -> m.getReadAt() == null)
                .toList();
        unread.forEach(m -> m.setReadAt(LocalDateTime.now()));
        messageRepository.saveAll(unread);
        return ResponseEntity.noContent().build();
    }

    /** Total de mensajes no leídos (para el badge de navegación) */
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        User me = getAuthenticatedUser();
        long count = messageRepository.countByReceiverIdAndReadAtIsNull(me.getId());
        return ResponseEntity.ok(Map.of("count", count));
    }
}
