package com.cyberclub.gateway;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.ClientResponse;
import reactor.core.publisher.Mono;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.Collections;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Component
public class Forward {

    private final Logger log = LoggerFactory.getLogger(Forward.class);
    private final String internalAuthSecret;
    
    // Scrub original host and length-related transport headers to avoid payload corruption
    private static final Set<String> IGNORED_HEADERS = Set.of(
        "authorization", 
        "x-user-id", 
        "x-internal-auth",
        "host", 
        "content-length", 
        "transfer-encoding", 
        "connection"
    );

    private final WebClient webClient = WebClient.builder()
            .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024)) // 10MB limit for GraphQL
            .build();

    public Forward(@Value("${INTERNAL_GATEWAY_SECRET}") String internalAuthSecret) {
        this.internalAuthSecret = Objects.requireNonNull(internalAuthSecret, "INTERNAL_GATEWAY_SECRET must be configured");
    }

    public ResponseEntity<byte[]> forward(HttpServletRequest request, String downstreamUrl) throws IOException {
        
        // 1. Construct the full downstream URL
        String url = downstreamUrl + request.getRequestURI();
        if (request.getQueryString() != null) {
            url += "?" + request.getQueryString();
        }

        // 2. Map Incoming Headers safely
        HttpHeaders headers = new HttpHeaders();
        Collections.list(request.getHeaderNames()).forEach(name -> {
            if (!IGNORED_HEADERS.contains(name.toLowerCase())) {
                headers.add(name, request.getHeader(name));
            }
        });

        // 3. Add Gateway Enrichment Headers
        headers.set("X-Internal-Auth", internalAuthSecret);
        if (request.getAttribute("userId") != null) {
            headers.set("X-User-Id", (String) request.getAttribute("userId"));
        }
        headers.set("X-Request-Id", UUID.randomUUID().toString());

        // 4. Read body content
        byte[] body = request.getInputStream().readAllBytes();

        // 5. Forward request via WebClient
        WebClient.RequestBodySpec spec = webClient
                .method(HttpMethod.valueOf(request.getMethod()))
                .uri(url)
                .headers(h -> h.addAll(headers));

        // Attach body only if request has content (POST/PUT/PATCH)
        if (body.length > 0) {
            spec.bodyValue(body);
        }

        return spec.exchangeToMono(this::handleResponse)
                .block(); 
    }

    private Mono<ResponseEntity<byte[]>> handleResponse(ClientResponse clientResponse) {
        return clientResponse.bodyToMono(byte[].class)
                .defaultIfEmpty(new byte[0])
                .map(body -> {
                    HttpHeaders responseHeaders = new HttpHeaders();
                    clientResponse.headers().asHttpHeaders().forEach((key, values) -> {
                        if (!key.equalsIgnoreCase("Transfer-Encoding")) {
                            responseHeaders.addAll(key, values);
                        }
                    });

                    return ResponseEntity
                            .status(clientResponse.statusCode())
                            .headers(responseHeaders)
                            .body(body);
                });
    }
}