package com.cyberclub.learn.api.graphql;

import com.cyberclub.learn.dtos.AuthResult;
import com.cyberclub.learn.security.Policies;
import com.cyberclub.learn.services.AuthService;

/** Shared authorization helpers for resolvers. */
final class Access {

    private Access() {}

    /** Requires LEARNER and reports whether the caller may see unpublished content. */
    static boolean learnerSeesDrafts(AuthService auth) {
        AuthResult r = auth.require(Policies.LEARNER);
        return "ADMIN".equals(r.role()) || "AUTHOR".equals(r.role());
    }
}
