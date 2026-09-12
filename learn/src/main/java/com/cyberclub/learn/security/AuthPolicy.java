package com.cyberclub.learn.security;

import com.cyberclub.learn.dtos.AuthResult;
import com.cyberclub.learn.exceptions.ForbiddenException;

public interface AuthPolicy {

    void check(AuthResult user);

    default AuthPolicy and(AuthPolicy other) {
        return user -> {
            this.check(user);
            other.check(user);
        };
    }

    default AuthPolicy or(AuthPolicy other) {
        return user -> {
            try {
                this.check(user);
            } catch (ForbiddenException e) {
                other.check(user);
            }
        };
    }

}