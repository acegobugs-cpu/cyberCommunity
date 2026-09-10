package com.cyberclub.learn.filters;

import java.util.UUID;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.cyberclub.learn.context.UserContext;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException{

        try {
            UUID userId = extractToken(request);
            if(userId != null){
                UserContext.setUserId(userId);
            }
            filterChain.doFilter(request, response);
        } finally {
            UserContext.clear();
        }
    }

    private UUID extractToken(HttpServletRequest request) {
        String userId = request.getHeader("X-User-Id");
        if (userId == null || userId.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(userId);
        } catch (IllegalArgumentException ex) {
            return null; // malformed header → treat as anonymous, don't 500
        }
    }
    
}
