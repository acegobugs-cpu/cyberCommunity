package com.cyberclub.portal.filters;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class GatewayTrustFilter extends OncePerRequestFilter {

    private final String secret;

    public GatewayTrustFilter(@Value ("${INTERNAL_GATEWAY_SECRET}") String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("INTERNAL_GATEWAY_SECRET must be configured and non-blank");
        }
        this.secret = secret;
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
            this.secret.getBytes(StandardCharsets.UTF_8))
        ){
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("""
                    {
                        "error": "unauthorized",
                        "message": "Gateway validation required"
                    }
                """);            
            return;
        }
        
        filterChain.doFilter(request, response);
    }


}
