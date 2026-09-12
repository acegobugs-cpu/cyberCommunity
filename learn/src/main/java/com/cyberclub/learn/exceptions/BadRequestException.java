package com.cyberclub.learn.exceptions;

public class BadRequestException extends RequestException {
    
    public BadRequestException(String message){
        super(message);
    }
}
