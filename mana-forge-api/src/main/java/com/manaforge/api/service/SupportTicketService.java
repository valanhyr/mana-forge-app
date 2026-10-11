package com.manaforge.api.service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.ArrayList;
import java.util.HashMap;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.AddressException;
import com.manaforge.api.dto.ContactRequest;
import com.manaforge.api.dto.FrontdeskDtos.*;
import com.manaforge.api.model.mongo.AuditEvent;
import com.manaforge.api.model.mongo.SupportTicket;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.SupportTicketRepository;
import com.manaforge.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class SupportTicketService {
    private final SupportTicketRepository tickets;
    private final UserRepository users;
    private final EmailEncryptionService encryption;
    private final FrontdeskAuditService audit;
    private final FrontdeskAccessService access;

    public SupportTicket requireTicket(String id) {
        return tickets.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    public TicketView view(SupportTicket ticket) {
        User owner = ticket.isCustomerVisible() && ticket.getUserId() != null && !ticket.getUserId().isBlank()
                ? users.findById(ticket.getUserId()).orElse(null) : null;
        return view(ticket, owner);
    }

    /** Resolve a page's owners in one query; never load conversations or look up owners by email. */
    public List<TicketView> views(List<SupportTicket> page) {
        List<String> ids = page.stream().filter(SupportTicket::isCustomerVisible).map(SupportTicket::getUserId)
                .filter(id -> id != null && !id.isBlank()).distinct().toList();
        Map<String, User> owners = new HashMap<>();
        if (!ids.isEmpty()) users.findAllById(ids).forEach(owner -> owners.put(owner.getId(), owner));
        return page.stream().map(ticket -> view(ticket, owners.get(ticket.getUserId()))).toList();
    }

    private TicketView view(SupportTicket ticket, User owner) {
        String email = encryption.decrypt(ticket.getUserEmail());
        var reason = webUnavailableReason(ticket, owner);
        List<SupportTicket.Channel> channels = new ArrayList<>();
        if (reason == null) channels.add(SupportTicket.Channel.WEB);
        if (isContactEmailValid(email)) channels.add(SupportTicket.Channel.EMAIL);
        return new TicketView(ticket.getId(), ticket.getUserId(), email,
                ticket.getUserName(), ticket.getSubject(), ticket.getCategory(), ticket.getPriority(),
                ticket.getStatus(), ticket.getAssignedOperatorId(), ticket.getAssignedOperatorName(),
                ticket.getMessages() == null ? List.of() : ticket.getMessages(),
                ticket.getCreatedAt(), ticket.getUpdatedAt(), ticket.getMetadata(), ticket.effectiveOrigin(),
                ticket.isCustomerVisible(), List.copyOf(channels), reason);
    }

    private SupportTicket.WebUnavailableReason webUnavailableReason(SupportTicket ticket, User owner) {
        if (!ticket.isCustomerVisible()) return SupportTicket.WebUnavailableReason.NOT_CUSTOMER_VISIBLE;
        if (ticket.getUserId() == null || ticket.getUserId().isBlank()) return SupportTicket.WebUnavailableReason.NO_OWNER;
        if (owner == null) return SupportTicket.WebUnavailableReason.OWNER_NOT_FOUND;
        if (owner.effectiveStatus() != User.AccountStatus.ACTIVE) return SupportTicket.WebUnavailableReason.OWNER_INACTIVE;
        if (!Boolean.TRUE.equals(owner.getValidated())) return SupportTicket.WebUnavailableReason.OWNER_UNVERIFIED;
        return null;
    }

    private boolean isContactEmailValid(String email) {
        if (email == null || email.isBlank() || email.length() > 254 || email.contains("\r") || email.contains("\n")) return false;
        try {
            InternetAddress address = new InternetAddress(email, true);
            address.validate();
            return address.getPersonal() == null && email.equals(address.getAddress());
        } catch (AddressException ignored) { return false; }
    }

    public TicketView create(CreateTicket request, User operator) {
        User customer = request.userId() == null || request.userId().isBlank() ? null
                : users.findById(request.userId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        SupportTicket ticket = newTicket(customer == null ? null : customer.getId(),
                customer == null ? encryption.encrypt(request.userEmail()) : customer.getEmail(),
                customer == null ? request.userName() : customer.getUsername(), request.subject(), request.initialMessage(),
                SupportTicket.Sender.OPERATOR, operator.getId(), operator.getUsername());
        ticket.setCategory(request.category());
        ticket.setPriority(request.priority());
        ticket.setMetadata(request.metadata());
        ticket.setCustomerVisible(customer != null);
        ticket.setOrigin(SupportTicket.Origin.FRONTDESK.name());
        ticket = tickets.save(ticket);
        record(operator, ticket, AuditEvent.Action.TICKET_CREATED, "Support ticket created");
        return view(ticket);
    }

    /** Called only after the contact controller's anti-spam checks. Anonymous contacts are supported. */
    public void createFromContact(ContactRequest request) {
        String encryptedEmail = encryption.encrypt(request.getEmail());
        User customer = users.findByEmail(encryptedEmail).orElse(null);
        SupportTicket ticket = newTicket(customer == null ? null : customer.getId(), encryptedEmail,
                request.getName(), request.getSubject(), request.getMessage(), SupportTicket.Sender.USER,
                null, request.getName());
        ticket.setOrigin(SupportTicket.Origin.CONTACT_FORM.name());
        ticket = tickets.save(ticket);
        // A contact email does not authenticate the sender; do not assert a registered user's identity.
        audit.record(new AuditEvent.Actor("contact", "Contact form", "SYSTEM"), ticket.getUserId(),
                ticket.getUserName(), AuditEvent.Action.TICKET_CREATED, "Contact received",
                Map.of("ticketId", ticket.getId()));
    }

    private SupportTicket newTicket(String userId, String email, String name, String subject, String content,
                                    SupportTicket.Sender sender, String senderId, String senderName) {
        SupportTicket ticket = new SupportTicket();
        ticket.setUserId(userId);
        ticket.setUserEmail(email);
        ticket.setUserName(name);
        ticket.setSubject(subject);
        ticket.setCreatedAt(Instant.now());
        ticket.setUpdatedAt(ticket.getCreatedAt());
        ticket.getMessages().add(new SupportTicket.Message(UUID.randomUUID().toString(), sender,
                senderId, senderName, content, ticket.getCreatedAt(), false));
        return ticket;
    }

    public TicketView addMessage(String id, AddMessage request, User operator) {
        SupportTicket ticket = requireTicket(id);
        if (!request.isInternalNote()) {
            User owner = ticket.isCustomerVisible() && ticket.getUserId() != null && !ticket.getUserId().isBlank()
                    ? users.findById(ticket.getUserId()).orElse(null) : null;
            if (webUnavailableReason(ticket, owner) != null) throw new WebChannelUnavailableException();
        }
        // Keep the embedded conversation safely below MongoDB's document size limit.
        if (ticket.getMessages().size() >= 500) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ticket message limit reached");
        }
        ticket.getMessages().add(new SupportTicket.Message(UUID.randomUUID().toString(), SupportTicket.Sender.OPERATOR,
                operator.getId(), operator.getUsername(), request.content(), Instant.now(), request.isInternalNote()));
        ticket.setUpdatedAt(Instant.now());
        if (!request.isInternalNote() && ticket.getStatus() != SupportTicket.Status.CLOSED
                && ticket.getStatus() != SupportTicket.Status.RESOLVED) ticket.setStatus(SupportTicket.Status.WAITING_USER);
        ticket = tickets.save(ticket); // @Version rejects concurrent overwrites instead of losing messages.
        record(operator, ticket, request.isInternalNote() ? AuditEvent.Action.TICKET_NOTE_ADDED
                : AuditEvent.Action.TICKET_MESSAGE_ADDED, request.isInternalNote() ? "Internal note added" : "Reply added");
        return view(ticket);
    }

    public TicketView updateStatus(String id, SupportTicket.Status status, User operator) {
        SupportTicket ticket = requireTicket(id);
        SupportTicket.Status previous = ticket.getStatus();
        ticket.setStatus(status);
        ticket.setUpdatedAt(Instant.now());
        ticket = tickets.save(ticket);
        record(operator, ticket, AuditEvent.Action.TICKET_STATUS_CHANGED, previous + " -> " + status);
        return view(ticket);
    }

    public TicketView assign(String id, String operatorId, User actor) {
        User operator = access.operatorById(operatorId);
        SupportTicket ticket = requireTicket(id);
        ticket.setAssignedOperatorId(operator.getId());
        ticket.setAssignedOperatorName(operator.getUsername());
        ticket.setUpdatedAt(Instant.now());
        ticket = tickets.save(ticket);
        record(actor, ticket, AuditEvent.Action.TICKET_ASSIGNED, "Assigned to " + operator.getUsername());
        return view(ticket);
    }

    private void record(User operator, SupportTicket ticket, AuditEvent.Action action, String details) {
        audit.record(operator, ticket.getUserId(), ticket.getUserName(), action, details,
                Map.of("ticketId", ticket.getId()));
    }

    public com.manaforge.api.dto.SupportDtos.Ticket customerView(SupportTicket ticket, boolean detail) {
        var messages = !detail || ticket.getMessages() == null ? List.<com.manaforge.api.dto.SupportDtos.Message>of()
                : ticket.getMessages().stream().filter(message -> !message.isInternalNote())
                .map(message -> new com.manaforge.api.dto.SupportDtos.Message(message.id(), message.sender(),
                        message.content(), message.createdAt())).toList();
        return new com.manaforge.api.dto.SupportDtos.Ticket(ticket.getId(), ticket.getSubject(), ticket.getCategory(),
                ticket.getStatus(), ticket.getCreatedAt(), ticket.getUpdatedAt(), messages);
    }

    public SupportTicket requireCustomerTicket(String id, User customer) {
        return tickets.findByIdAndUserIdAndCustomerVisibleTrue(id, customer.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    public PageResult<com.manaforge.api.dto.SupportDtos.Ticket> customerTickets(User customer, int page, int size) {
        if (page < 0 || size < 1 || size > 100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        var result = tickets.findByUserIdAndCustomerVisibleTrue(customer.getId(),
                org.springframework.data.domain.PageRequest.of(page, size,
                        org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "updatedAt", "id")));
        return new PageResult<>(result.stream().map(ticket -> customerView(ticket, false)).toList(), page, size, result.getTotalElements());
    }

    public com.manaforge.api.dto.SupportDtos.Ticket createForCustomer(com.manaforge.api.dto.SupportDtos.Create request, User customer) {
        if (tickets.countByUserIdAndStatusIn(customer.getId(), List.of(SupportTicket.Status.OPEN,
                SupportTicket.Status.IN_PROGRESS, SupportTicket.Status.WAITING_USER)) >= 20) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many open tickets");
        }
        SupportTicket ticket = newTicket(customer.getId(), customer.getEmail(), customer.getUsername(),
                request.subject().trim(), request.content().trim(), SupportTicket.Sender.USER,
                customer.getId(), customer.getUsername());
        ticket.setCategory(request.category());
        ticket.setCustomerVisible(true);
        ticket.setOrigin(SupportTicket.Origin.SUPPORT_WEB.name());
        ticket = tickets.save(ticket);
        recordCustomer(customer, ticket, AuditEvent.Action.TICKET_CREATED, "Customer opened support conversation");
        return customerView(ticket, true);
    }

    public com.manaforge.api.dto.SupportDtos.Ticket replyForCustomer(String id,
            com.manaforge.api.dto.SupportDtos.Reply request, User customer) {
        SupportTicket ticket = requireCustomerTicket(id, customer);
        if (ticket.getStatus() == SupportTicket.Status.CLOSED || ticket.getMessages().size() >= 500) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ticket is closed or message limit reached");
        }
        ticket.getMessages().add(new SupportTicket.Message(UUID.randomUUID().toString(), SupportTicket.Sender.USER,
                customer.getId(), customer.getUsername(), request.content().trim(), Instant.now(), false));
        ticket.setUpdatedAt(Instant.now());
        ticket.setStatus(SupportTicket.Status.OPEN);
        ticket = tickets.save(ticket);
        recordCustomer(customer, ticket, AuditEvent.Action.TICKET_MESSAGE_ADDED, "Customer replied");
        return customerView(ticket, true);
    }

    private void recordCustomer(User customer, SupportTicket ticket, AuditEvent.Action action, String details) {
        audit.record(new AuditEvent.Actor(customer.getId(), customer.getUsername(), "USER"), ticket.getUserId(),
                ticket.getUserName(), action, details, Map.of("ticketId", ticket.getId()));
    }
}
