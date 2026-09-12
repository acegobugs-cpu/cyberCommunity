package com.cyberclub.learn.security;

import java.util.UUID;

import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import com.cyberclub.learn.dtos.AuthResult;
import com.cyberclub.learn.exceptions.ForbiddenException;
import com.cyberclub.learn.exceptions.NotFoundException;
import com.cyberclub.learn.exceptions.UnauthorizedException;

import reactor.core.publisher.Mono;

@Component
public class ClientAuth {
    
    private final WebClient webClient;

    public ClientAuth(WebClient webClient){
        this.webClient = webClient;
    }

    public AuthResult checkMembership( UUID id){
        return webClient
                .get()
                .uri( uriBuilder -> uriBuilder
                    .path("/private/api/member/check")
                    .queryParam("userId", id)
                    .queryParam("serviceName", "portal")
                    .build()
                )
                .exchangeToMono(res -> {
                    int status = res.statusCode().value();

                    if (status == 200) {
                        return res.bodyToMono(AuthResult.class);
                    }

                    if (status == 401) {
                        return Mono.error(new UnauthorizedException("Unauthorized"));
                    }

                    if (status == 403) {
                        return Mono.error(new ForbiddenException("Forbidden"));
                    }

                    if (status == 404) {
                        return Mono.error(new NotFoundException("Membership not found"));
                    }

                    if (status >= 500) {
                        return Mono.error(new RuntimeException("Identity service unavailable"));
                    }

                    return Mono.error(new RuntimeException("Unexpected response from Identity: " + status));
                })
                .block();
    }
}
