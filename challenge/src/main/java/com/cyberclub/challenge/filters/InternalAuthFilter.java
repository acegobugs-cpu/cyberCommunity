package com.cyberclub.challenge.filters;

import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;

import java.util.Objects;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

@Component
public class InternalAuthFilter {

    private static final String HEADER = "X-Internal-Auth";
    private final String secret;

    public InternalAuthFilter(@Value("${INTERNAL_GATEWAY_SECRET}") String secret) {
        this.secret = Objects.requireNonNull(secret, "INTERNAL_GATEWAY_SECRET must be configured");
    }

    public ExchangeFilterFunction filter() {
        return ExchangeFilterFunction.ofRequestProcessor(request -> {
            ClientRequest mutated = ClientRequest.from(request)
                .header(HEADER, secret)
                .build();
            return Mono.just(mutated);
        });
    }
}
