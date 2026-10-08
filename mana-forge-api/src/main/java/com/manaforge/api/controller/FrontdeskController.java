package com.manaforge.api.controller;

import com.manaforge.api.dto.FrontdeskDtos.*;
import com.manaforge.api.model.mongo.AuditEvent;
import com.manaforge.api.model.mongo.EmailDelivery;
import com.manaforge.api.model.mongo.SupportTicket;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.service.*;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

/** Deliberately not generic CRUD: no audit mutation, credential exposure or client-supplied actor IDs. */
@RestController
@RequestMapping("/api/frontdesk")
@RequiredArgsConstructor
public class FrontdeskController {
    private final FrontdeskAccessService access;
    private final FrontdeskQueryService queries;
    private final SupportTicketService tickets;
    private final FrontdeskUserService users;
    private final DirectusEmailTemplateService templates;
    private final FrontdeskEmailService emails;
    private final NewsletterService newsletter;
    private final NewsletterCampaignService campaigns;

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken token) {
        return Map.of("headerName", token.getHeaderName(), "token", token.getToken());
    }

    @GetMapping("/me")
    public Map<String, String> me(Authentication authentication) {
        User operator = access.requireOperator(authentication);
        return Map.of("id", operator.getId(), "name", operator.getUsername(), "role", "OPERATOR");
    }

    @GetMapping("/tickets")
    public PageResult<TicketView> tickets(@RequestParam(required = false) SupportTicket.Status status,
            @RequestParam(required = false) SupportTicket.Priority priority,
            @RequestParam(required = false) SupportTicket.Category category, @RequestParam(required = false) String userId,
            @RequestParam(required = false) String query, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return queries.tickets(status, priority, category, userId, query, page, size);
    }

    @GetMapping("/tickets/{id}")
    public TicketView ticket(@PathVariable String id) { return tickets.view(tickets.requireTicket(id)); }

    @PostMapping("/tickets")
    public ResponseEntity<TicketView> create(@Valid @RequestBody CreateTicket request, Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(tickets.create(request, access.requireOperator(authentication)));
    }

    @PostMapping("/tickets/{id}/messages")
    public TicketView message(@PathVariable String id, @Valid @RequestBody AddMessage request, Authentication authentication) {
        return tickets.addMessage(id, request, access.requireOperator(authentication));
    }

    @PatchMapping("/tickets/{id}/status")
    public TicketView ticketStatus(@PathVariable String id, @Valid @RequestBody TicketStatusUpdate request,
                                   Authentication authentication) {
        return tickets.updateStatus(id, request.status(), access.requireOperator(authentication));
    }

    @PatchMapping("/tickets/{id}/assignee")
    public TicketView assign(@PathVariable String id, @Valid @RequestBody AssignOperator request, Authentication authentication) {
        return tickets.assign(id, request.operatorId(), access.requireOperator(authentication));
    }

    @GetMapping("/users")
    public PageResult<UserView> users(@RequestParam(required = false) String query,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "25") int size) {
        return queries.users(query, page, size);
    }

    @GetMapping("/users/{id}")
    public UserView user(@PathVariable String id) { return users.get(id); }

    @PatchMapping("/users/{id}/status")
    public UserView userStatus(@PathVariable String id, @Valid @RequestBody UserStatusUpdate request,
                               Authentication authentication) {
        return users.updateStatus(id, request.status(), access.requireOperator(authentication));
    }

    @PostMapping("/users/{id}/ai-quota/reset")
    public UserView resetQuota(@PathVariable String id, Authentication authentication) {
        return users.resetQuota(id, access.requireOperator(authentication));
    }

    @GetMapping("/audit")
    public PageResult<AuditEvent> audit(@RequestParam(required = false) String targetUserId,
            @RequestParam(required = false) AuditEvent.Action action, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return queries.audit(targetUserId, action, page, size);
    }

    @GetMapping("/email-templates")
    public List<EmailTemplate> templates() { return templates.list(); }

    @PostMapping("/email-templates/{id}/render")
    public RenderedTemplate render(@PathVariable String id, @Valid @RequestBody RenderTemplate request) {
        return templates.render(id, request.variables());
    }

    @PostMapping("/emails")
    public EmailResult send(@Valid @RequestBody SendEmail request, Authentication authentication) {
        return emails.send(request, access.requireOperator(authentication));
    }

    @GetMapping("/emails")
    public PageResult<EmailDelivery> deliveries(@RequestParam(required = false) String ticketId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "25") int size) {
        return queries.deliveries(ticketId, page, size);
    }

    @GetMapping("/newsletter/subscribers")
    public PageResult<NewsletterService.Subscriber> subscribers(@RequestParam(required = false) String query,
            @RequestParam(required = false) User.Tier tier, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return newsletter.subscribers(query, tier, page, size);
    }

    @PostMapping("/newsletter/campaigns")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public com.manaforge.api.dto.NewsletterDtos.Campaign sendNewsletter(
            @Valid @RequestBody com.manaforge.api.dto.NewsletterDtos.Send request, Authentication authentication) {
        return campaigns.start(request, access.requireOperator(authentication));
    }

    @GetMapping("/newsletter/campaigns/{id}")
    public com.manaforge.api.dto.NewsletterDtos.Campaign campaign(@PathVariable String id) { return campaigns.get(id); }

    @GetMapping("/newsletter/campaigns")
    public PageResult<com.manaforge.api.dto.NewsletterDtos.Campaign> campaigns(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) { return campaigns.list(page, size); }
}
