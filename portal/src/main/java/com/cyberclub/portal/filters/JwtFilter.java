package com.cyberclub.portal.filters;

import java.io.IOException;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.cyberclub.portal.context.UserContext;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtFilter extends OncePerRequestFilter {
    private final Logger log = LoggerFactory.getLogger(JwtFilter.class);

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    )throws ServletException, IOException{
        try{
            UUID userId = extractToken(request, response);
            if(userId != null){
                UserContext.set(userId);
            }
            filterChain.doFilter(request, response);
        } finally {
            UserContext.clear();
        }
    }

    private UUID extractToken(HttpServletRequest request, HttpServletResponse response) {
        String userId = request.getHeader("X-User-Id");
        if (userId == null || userId.isBlank()) {
            log.error("userId not found.. userId = {}", userId);
            try {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "userId missing");
            } catch (IOException e) {
                log.error("Error sending unauthorized response", e);
            }
            return null;
        }
        try {
            return UUID.fromString(userId);
        } catch (IllegalArgumentException ex) {
            log.error("userId not valid UUID.. userId = {}", userId);
            try {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "userId Invalid UUID");
            } catch (IOException e) {
                log.error("Error sending unauthorized response", e);
            }
            return null;
        }
    }

}
