package com.cyberclub.identity.filters;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class InternalAuthFilter extends OncePerRequestFilter {
    private final String secret;

    
    public InternalAuthFilter(@Value("${INTERNAL_GATEWAY_SECRET}") String secret) {
        this.secret = Objects.requireNonNull(secret, "INTERNAL_GATEWAY_SECRET must be configured");
    }

    @Override
    public void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException{
        
        String requestSecret = request.getHeader("X-Internal-Auth");

        if(requestSecret == null || !MessageDigest.isEqual(
            requestSecret.getBytes(StandardCharsets.UTF_8), 
            secret.getBytes(StandardCharsets.UTF_8))
        ){
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("""
                    {
                        "error": "unauthorized",
                        "message": "Gateway validation is required"
                    }
                    """);
            return;
        }

        filterChain.doFilter(request, response);

    }
}
