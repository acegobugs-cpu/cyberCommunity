package com.cyberclub.challenge.security;

import java.util.UUID;

import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import reactor.core.publisher.Mono;

@Component
public class ClientIdentity{

    private final WebClient webClient;

    public ClientIdentity(WebClient webClient){
        this.webClient = webClient;
    }

    public IdentityCheckResult checkMembership(UUID userId){
        return webClient
                .get()
                .uri(uriBuilder -> uriBuilder
                    .path("/private/api/member/check")
                    .queryParam("userId", userId)
                    .queryParam("serviceName", "challenge")
                    .build()
                )
                .retrieve()
                .onStatus(
                    status -> status.value() == 403,
                    res -> Mono.error(new RuntimeException("Forbidden"))
                )
                .onStatus(
                    status -> status.value() == 404,
                    res -> Mono.error(new RuntimeException("Not Found"))
                )
                .bodyToMono(IdentityCheckResult.class)
                .block();

    }
}