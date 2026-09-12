package com.cyberclub.learn.filters;

import java.io.IOException;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerExceptionResolver;

import com.cyberclub.learn.context.UserContext;
import com.cyberclub.learn.exceptions.UnauthorizedException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtFilter extends OncePerRequestFilter {
    private final Logger log = LoggerFactory.getLogger(JwtFilter.class);
    private final HandlerExceptionResolver resolver;

    public JwtFilter(@Qualifier("handlerExceptionResolver") HandlerExceptionResolver resolver) {
        this.resolver = resolver;
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {

        try {
            String header = request.getHeader("X-User-Id");

            if (header == null || header.isBlank()) {
                log.error("userId header missing");
                resolver.resolveException(request, response, null, new UnauthorizedException("userId header missing"));
                return;
            }

            try {
                UUID userId = UUID.fromString(header);
                UserContext.setUserId(userId);
            } catch (IllegalArgumentException ex) {
                log.error("userId invalid UUID: {}", header);
                resolver.resolveException(request, response, null, new UnauthorizedException("userId Invalid UUID"));
                return;
            }

            filterChain.doFilter(request, response);
        } finally {
            UserContext.clear();
        }
    }
}