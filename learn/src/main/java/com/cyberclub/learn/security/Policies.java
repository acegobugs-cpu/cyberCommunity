package com.cyberclub.learn.security;

import com.cyberclub.learn.exceptions.ForbiddenException;

public final class Policies {

    /** Role identity grants to every registered user (see identity MembershipRepo). */
    public static final AuthPolicy MEMBER =
        user -> {
            if(!"USER".equals(user.role())){
                throw new ForbiddenException("Unauthorized Access");
            }
        };

    public static final AuthPolicy ADMIN =
        user -> {
            if(!"ADMIN".equals(user.role())){
                throw new ForbiddenException("Unauthorized Access");
            }
        };

    /** Reserved content-author role; identity does not grant it yet, so always combine with ADMIN. */
    public static final AuthPolicy AUTHOR =
        user -> {
            if(!"AUTHOR".equals(user.role())){
                throw new ForbiddenException("Unauthorized Access");
            }
        };

    /** Anyone who may consume content. */
    public static final AuthPolicy LEARNER = MEMBER.or(AUTHOR).or(ADMIN);

    /** Anyone who may create/edit content. */
    public static final AuthPolicy CONTENT_AUTHOR = AUTHOR.or(ADMIN);

    private Policies(){}
}
