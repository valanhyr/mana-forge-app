package com.manaforge.api.controller;

import com.manaforge.api.dto.UserDto;
import com.manaforge.api.model.mongo.Follow;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.FollowRepository;
import com.manaforge.api.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/follows")
public class FollowController {

    private final UserRepository userRepository;
    private final FollowRepository followRepository;

    public FollowController(UserRepository userRepository, FollowRepository followRepository) {
        this.userRepository = userRepository;
        this.followRepository = followRepository;
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

    /** Seguir a un usuario */
    @PostMapping("/{userId}")
    public ResponseEntity<Void> follow(@PathVariable String userId) {
        User me = getAuthenticatedUser();

        if (me.getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot follow yourself");
        }
        userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (followRepository.findByFollowerIdAndFollowingId(me.getId(), userId).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Already following");
        }

        followRepository.save(new Follow(me.getId(), userId));
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    /** Dejar de seguir */
    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> unfollow(@PathVariable String userId) {
        User me = getAuthenticatedUser();
        followRepository.findByFollowerIdAndFollowingId(me.getId(), userId)
                .ifPresent(followRepository::delete);
        return ResponseEntity.noContent().build();
    }

    /** Usuarios que sigo */
    @GetMapping("/following")
    public ResponseEntity<List<UserDto>> getFollowing() {
        User me = getAuthenticatedUser();
        List<UserDto> following = followRepository.findByFollowerId(me.getId()).stream()
                .map(f -> userRepository.findById(f.getFollowingId()).map(this::toDto).orElse(null))
                .filter(u -> u != null)
                .toList();
        return ResponseEntity.ok(following);
    }

    /** Usuarios que me siguen */
    @GetMapping("/followers")
    public ResponseEntity<List<UserDto>> getFollowers() {
        User me = getAuthenticatedUser();
        List<UserDto> followers = followRepository.findByFollowingId(me.getId()).stream()
                .map(f -> userRepository.findById(f.getFollowerId()).map(this::toDto).orElse(null))
                .filter(u -> u != null)
                .toList();
        return ResponseEntity.ok(followers);
    }

    /** Estado de seguimiento respecto a un usuario (y sus contadores) */
    @GetMapping("/{userId}/status")
    public ResponseEntity<Map<String, Object>> getStatus(@PathVariable String userId) {
        User me = getAuthenticatedUser();
        boolean following = followRepository.findByFollowerIdAndFollowingId(me.getId(), userId).isPresent();
        long followersCount = followRepository.countByFollowingId(userId);
        long followingCount = followRepository.countByFollowerId(userId);
        return ResponseEntity.ok(Map.of(
                "following", following,
                "followersCount", followersCount,
                "followingCount", followingCount
        ));
    }
}
