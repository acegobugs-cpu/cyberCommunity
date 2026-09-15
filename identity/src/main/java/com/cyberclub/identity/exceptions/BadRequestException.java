package com.cyberclub.identity.exceptions;

public class BadRequestException extends RuntimeException {
    
    public BadRequestException(String message){
        super(message);
    }
}
