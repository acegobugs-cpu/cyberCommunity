package com.cyberclub.learn.api.graphql;

import com.cyberclub.learn.dtos.AuthResult;
import com.cyberclub.learn.security.Policies;
import com.cyberclub.learn.services.AuthService;

import graphql.GraphQLContext;

/** Shared authorization helpers for resolvers. */
final class Access {

    /** GraphQLContext key: whether the caller may see unpublished content (set by top-level query resolvers). */
    static final String DRAFTS = "learn.drafts";

    private Access() {}

    /** Requires LEARNER and reports whether the caller may see unpublished content. */
    static boolean learnerSeesDrafts(AuthService auth) {
        AuthResult r = auth.require(Policies.LEARNER);
        return "ADMIN".equals(r.role()) || "AUTHOR".equals(r.role());
    }

    /** Same, and records the answer in the request context for nested batch resolvers. */
    static boolean learnerSeesDrafts(AuthService auth, GraphQLContext ctx) {
        boolean drafts = learnerSeesDrafts(auth);
        ctx.put(DRAFTS, drafts);
        return drafts;
    }

    /** What a top-level resolver decided earlier in this request; false when none did. */
    static boolean drafts(GraphQLContext ctx) {
        return Boolean.TRUE.equals(ctx.get(DRAFTS));
    }
}
