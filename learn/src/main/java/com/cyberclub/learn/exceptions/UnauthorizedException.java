package com.cyberclub.learn.exceptions;

public class UnauthorizedException extends RequestException {

    public UnauthorizedException(String message){
        super(message);
    }
}
