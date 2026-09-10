package com.cyberclub.learn.filters;

import java.io.IOException;
import java.util.UUID;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.cyberclub.learn.context.TraceContext;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.util.regex.Pattern;

@Component
public class CorrelationFilter extends OncePerRequestFilter{

    private static final int MAX_CORRELATION_ID_LENGTH = 64;
    private static final Pattern VALID_CORRELATION_ID = Pattern.compile("^[a-zA-Z0-9\\-_]+$");

    private boolean isValidCorrelationId(String correlationId) {
        return correlationId != null 
            && !correlationId.isBlank()
            && correlationId.length() <= MAX_CORRELATION_ID_LENGTH
            && VALID_CORRELATION_ID.matcher(correlationId).matches();
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException{

        String correlationId = request.getHeader("X-Request-Id");
        if(!isValidCorrelationId(correlationId)){
            correlationId = UUID.randomUUID().toString();
        }

        TraceContext.setCorrelationId(correlationId);
        response.setHeader("X-Request-Id", correlationId);

        try{
            filterChain.doFilter(request, response);
        }finally{
            TraceContext.clear();
        }

    }

}