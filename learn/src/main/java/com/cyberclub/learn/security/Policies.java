package com.cyberclub.learn.security;

import com.cyberclub.learn.exceptions.ForbiddenException;

public final class Policies {

    public static final AuthPolicy ADMIN =
        user -> {
            if(!"ADMIN".equals(user.role())){
                throw new ForbiddenException("Unauthorized Access");
            }
        };

    public static final AuthPolicy AUTHOR =
        user -> {
            if(!"AUTHOR".equals(user.role())){
                throw new ForbiddenException("Unauthorized Access");
            }
        };

    public static final AuthPolicy MEMBER =
        user -> {
            if(!"MEMBER".equals(user.role())){
                throw new ForbiddenException("Unauthorized Access");
            }
        };


    private Policies(){}
}
