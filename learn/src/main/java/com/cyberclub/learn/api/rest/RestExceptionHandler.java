package com.cyberclub.learn.api.rest;

import java.time.Instant;

import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.cyberclub.learn.dtos.ErrorResponse;
import com.cyberclub.learn.exceptions.BadRequestException;
import com.cyberclub.learn.exceptions.ForbiddenException;
import com.cyberclub.learn.exceptions.NotFoundException;
import com.cyberclub.learn.exceptions.UnauthorizedException;
import com.cyberclub.learn.context.TraceContext;

import jakarta.servlet.http.HttpServletRequest;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestControllerAdvice
public class RestExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(RestExceptionHandler.class);

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorResponse handleError(Exception ex, HttpServletRequest req){
        log.error("[{}] Unhandled exception at {}  : {}", 
            TraceContext.getCorrelationId(), req.getRequestURI(), ex.getMessage());

        return new ErrorResponse(
            "INTERNAL_ERROR",
            "internal server error",
            req.getRequestURI(),
            TraceContext.getCorrelationId(),
            Instant.now()
        );
    }

    @ExceptionHandler(ForbiddenException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ErrorResponse handleForbidden(ForbiddenException ex, HttpServletRequest req){
        return new ErrorResponse(
            "FORBIDDEN",
            ex.getMessage(),
            req.getRequestURI(),
            TraceContext.getCorrelationId(),
            Instant.now()
        );
    }

    @ExceptionHandler(UnauthorizedException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ErrorResponse handleUnAuthorized( UnauthorizedException ex, HttpServletRequest req){
        return new ErrorResponse(
            "UNAUTHORIZED",
            ex.getMessage(),
            req.getRequestURI(),
            TraceContext.getCorrelationId(),
            Instant.now()
        );
    }

    @ExceptionHandler(NotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(NotFoundException ex, HttpServletRequest req){
        return new ErrorResponse(
            "NOT_FOUND",
            ex.getMessage(),
            req.getRequestURI(),
            TraceContext.getCorrelationId(),
            Instant.now()
        );
    }

    @ExceptionHandler(BadRequestException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleBadRequest(BadRequestException ex, HttpServletRequest req){
        return new ErrorResponse(
            "BAD_REQUEST",
            ex.getMessage(),
            req.getRequestURI(),
            TraceContext.getCorrelationId(),
            Instant.now()
        );
    }

    @ExceptionHandler(DataAccessException.class)
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public ErrorResponse handleDataAccess(DataAccessException ex, HttpServletRequest req){
        log.error("[{}] Database error at {}: {}", 
            TraceContext.getCorrelationId(), req.getRequestURI(), ex.getMessage(), ex);
            
        return new ErrorResponse(
            "SERVICE_UNAVAILABLE",
            "database is not available",
            req.getRequestURI(),
            TraceContext.getCorrelationId(),
            Instant.now()
        );
    }
}
