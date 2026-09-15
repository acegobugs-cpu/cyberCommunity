package com.cyberclub.identity.api.restcontrollers;

import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import jakarta.servlet.http.HttpServletRequest;

import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.cyberclub.identity.api.dtos.ErrorResponse;
import com.cyberclub.identity.exceptions.UnauthorizedException;
import com.cyberclub.identity.exceptions.BadRequestException;
import com.cyberclub.identity.exceptions.ConflictException;
import com.cyberclub.identity.exceptions.NotFoundException;

@RestControllerAdvice
public class ControllerExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ControllerExceptionHandler.class);

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorResponse handleError(Exception ex, HttpServletRequest req){
        log.error("[{}] Unhandled exception at {}  : {}", 
            req.getHeader("X-Request-Id"), req.getRequestURI(), ex.getMessage());

        return new ErrorResponse(
            "INTERNAL_ERROR",
            "internal server error",
            req.getRequestURI(),
            req.getHeader("X-Request-Id"),
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
            req.getHeader("X-Request-Id"),
            Instant.now()
        );
    }

    @ExceptionHandler(ConflictException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ErrorResponse handleConflict( ConflictException ex, HttpServletRequest req){
        return new ErrorResponse(
            "CONFLICT",
            ex.getMessage(),
            req.getRequestURI(),
            req.getHeader("X-Request-Id"),
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
            req.getHeader("X-Request-Id"),
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
            req.getHeader("X-Request-Id"),
            Instant.now()
        );
    }
}
