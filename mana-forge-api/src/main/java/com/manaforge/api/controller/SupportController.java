package com.manaforge.api.controller;

import com.manaforge.api.dto.FrontdeskDtos.PageResult;
import com.manaforge.api.dto.SupportDtos;
import com.manaforge.api.service.AccountAccessService;
import com.manaforge.api.service.SupportTicketService;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/support")
@RequiredArgsConstructor
public class SupportController {
    private final AccountAccessService access;
    private final SupportTicketService tickets;

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken token) {
        return Map.of("headerName", token.getHeaderName(), "token", token.getToken());
    }

    @GetMapping("/tickets")
    public PageResult<SupportDtos.Ticket> list(Authentication authentication,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "25") int size) {
        return tickets.customerTickets(access.requireAccount(authentication), page, size);
    }

    @GetMapping("/tickets/{id}")
    public SupportDtos.Ticket detail(@PathVariable String id, Authentication authentication) {
        return tickets.customerView(tickets.requireCustomerTicket(id, access.requireAccount(authentication)), true);
    }

    @PostMapping("/tickets")
    @ResponseStatus(HttpStatus.CREATED)
    public SupportDtos.Ticket create(@Valid @RequestBody SupportDtos.Create request, Authentication authentication) {
        return tickets.createForCustomer(request, access.requireAccount(authentication));
    }

    @PostMapping("/tickets/{id}/messages")
    public SupportDtos.Ticket reply(@PathVariable String id, @Valid @RequestBody SupportDtos.Reply request,
                                   Authentication authentication) {
        return tickets.replyForCustomer(id, request, access.requireAccount(authentication));
    }
}
