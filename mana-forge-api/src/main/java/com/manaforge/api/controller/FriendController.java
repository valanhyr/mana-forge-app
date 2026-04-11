package com.manaforge.api.controller;

import com.manaforge.api.dto.UserDto;
import com.manaforge.api.model.mongo.FriendRequest;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.FriendRequestRepository;
import com.manaforge.api.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/friends")
public class FriendController {

    private final UserRepository userRepository;
    private final FriendRequestRepository friendRequestRepository;

    public FriendController(UserRepository userRepository, FriendRequestRepository friendRequestRepository) {
        this.userRepository = userRepository;
        this.friendRequestRepository = friendRequestRepository;
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

    private UserDto toDto(User u) {
        return UserDto.builder()
                .userId(u.getId())
                .name(u.getName())
                .username(u.getUsername())
                .email(u.getEmail())
                .biography(u.getBiography())
                .avatar(u.getAvatar())
                .build();
    }

    // ── Endpoints ────────────────────────────────────────────────────────────

    /** Lista de amigos aceptados del usuario autenticado */
    @GetMapping
    public ResponseEntity<List<UserDto>> getFriends() {
        User me = getAuthenticatedUser();
        String[] friendIds = me.getFriends();
        if (friendIds == null || friendIds.length == 0) {
            return ResponseEntity.ok(List.of());
        }
        List<UserDto> friends = userRepository.findAllById(Arrays.asList(friendIds))
                .stream().map(this::toDto).toList();
        return ResponseEntity.ok(friends);
    }

    /** Solicitudes recibidas pendientes */
    @GetMapping("/requests/received")
    public ResponseEntity<List<Map<String, Object>>> getReceivedRequests() {
        User me = getAuthenticatedUser();
        List<FriendRequest> requests = friendRequestRepository
                .findByReceiverIdAndStatus(me.getId(), "PENDING");

        List<Map<String, Object>> result = requests.stream().map(req -> {
            UserDto sender = userRepository.findById(req.getSenderId())
                    .map(this::toDto).orElse(null);
            return Map.<String, Object>of(
                    "requestId", req.getId(),
                    "sender", sender != null ? sender : Map.of(),
                    "createdAt", req.getCreatedAt().toString()
            );
        }).toList();

        return ResponseEntity.ok(result);
    }

    /** Solicitudes enviadas pendientes */
    @GetMapping("/requests/sent")
    public ResponseEntity<List<Map<String, Object>>> getSentRequests() {
        User me = getAuthenticatedUser();
        List<FriendRequest> requests = friendRequestRepository
                .findBySenderIdAndStatus(me.getId(), "PENDING");

        List<Map<String, Object>> result = requests.stream().map(req -> {
            UserDto receiver = userRepository.findById(req.getReceiverId())
                    .map(this::toDto).orElse(null);
            return Map.<String, Object>of(
                    "requestId", req.getId(),
                    "receiver", receiver != null ? receiver : Map.of(),
                    "createdAt", req.getCreatedAt().toString()
            );
        }).toList();

        return ResponseEntity.ok(result);
    }

    /** Enviar solicitud de amistad */
    @PostMapping("/requests/{targetUserId}")
    public ResponseEntity<Void> sendRequest(@PathVariable String targetUserId) {
        User me = getAuthenticatedUser();

        if (me.getId().equals(targetUserId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot send friend request to yourself");
        }

        userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        // Verificar que no existe ya una solicitud o amistad
        boolean alreadyFriends = me.getFriends() != null &&
                Arrays.asList(me.getFriends()).contains(targetUserId);
        if (alreadyFriends) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Already friends");
        }

        boolean requestExists = friendRequestRepository
                .findBySenderIdAndReceiverId(me.getId(), targetUserId).isPresent()
                || friendRequestRepository
                .findBySenderIdAndReceiverId(targetUserId, me.getId()).isPresent();
        if (requestExists) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Friend request already exists");
        }

        friendRequestRepository.save(new FriendRequest(me.getId(), targetUserId));
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    /** Aceptar solicitud de amistad */
    @PutMapping("/requests/{requestId}/accept")
    public ResponseEntity<Void> acceptRequest(@PathVariable String requestId) {
        User me = getAuthenticatedUser();

        FriendRequest req = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (!req.getReceiverId().equals(me.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }

        if (!"PENDING".equals(req.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request is not pending");
        }

        // Añadir a ambos usuarios
        addFriend(me, req.getSenderId());
        userRepository.findById(req.getSenderId()).ifPresent(sender -> addFriend(sender, me.getId()));

        req.setStatus("ACCEPTED");
        friendRequestRepository.save(req);

        return ResponseEntity.noContent().build();
    }

    /** Rechazar o cancelar solicitud */
    @DeleteMapping("/requests/{requestId}")
    public ResponseEntity<Void> deleteRequest(@PathVariable String requestId) {
        User me = getAuthenticatedUser();

        FriendRequest req = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (!req.getReceiverId().equals(me.getId()) && !req.getSenderId().equals(me.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }

        req.setStatus("REJECTED");
        friendRequestRepository.save(req);
        return ResponseEntity.noContent().build();
    }

    /** Eliminar amigo */
    @DeleteMapping("/{friendId}")
    public ResponseEntity<Void> removeFriend(@PathVariable String friendId) {
        User me = getAuthenticatedUser();
        removeFriendFromUser(me, friendId);
        userRepository.findById(friendId).ifPresent(friend -> removeFriendFromUser(friend, me.getId()));
        return ResponseEntity.noContent().build();
    }

    /** Buscar usuarios por username (para añadir amigos) */
    @GetMapping("/search")
    public ResponseEntity<List<UserDto>> searchUsers(@RequestParam String q) {
        if (q == null || q.length() < 2) return ResponseEntity.ok(List.of());
        User me = getAuthenticatedUser();
        List<UserDto> results = userRepository.findAll().stream()
                .filter(u -> !u.getId().equals(me.getId()))
                .filter(u -> u.getUsername() != null && u.getUsername().toLowerCase().contains(q.toLowerCase()))
                .limit(10)
                .map(this::toDto)
                .toList();
        return ResponseEntity.ok(results);
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private void addFriend(User user, String friendId) {
        List<String> friends = new ArrayList<>(
                user.getFriends() != null ? Arrays.asList(user.getFriends()) : List.of()
        );
        if (!friends.contains(friendId)) {
            friends.add(friendId);
            user.setFriends(friends.toArray(new String[0]));
            userRepository.save(user);
        }
    }

    private void removeFriendFromUser(User user, String friendId) {
        if (user.getFriends() == null) return;
        List<String> friends = new ArrayList<>(Arrays.asList(user.getFriends()));
        friends.remove(friendId);
        user.setFriends(friends.toArray(new String[0]));
        userRepository.save(user);
    }
}
