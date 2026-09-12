package com.cyberclub.learn.exceptions;

public class ForbiddenException extends RequestException{

    public ForbiddenException(String message) {
        super(message);
    }
}