package com.cyberclub.challenge.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

import com.cyberclub.challenge.filters.InternalAuthFilter;

@Configuration
public class WebClientConfig {

    @Bean
    public WebClient identityWebClient(
        @Value("${identity.base-url}") String baseUrl,
        InternalAuthFilter internalAuthFilter) {

        return WebClient.builder()
                .baseUrl(baseUrl)
                .filter(internalAuthFilter.filter())
                .build();
    }
}
