package com.cyberclub.learn;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.graphql.execution.ErrorType;
import org.springframework.graphql.test.tester.HttpGraphQlTester;

import com.cyberclub.learn.dtos.domain.Path;

/**
 * Authorization matrix for the Learn GraphQL API. Every resolver calls
 * identity for the caller's role; identity is faked per test.
 */
class LearnGraphQlAuthTest extends BaseIntegrationTest {

    private static final String PATHS = "{ paths { id title modules { id lessons { id } } } }";
    private static final String CREATE_PATH =
        "mutation($t: String!) { upsertPath(input: { title: $t }) { id slug title status } }";

    @Autowired
    private HttpGraphQlTester graphQl;

    private HttpGraphQlTester as(String userId) {
        return graphQl.mutate()
                .header("X-Internal-Auth", SECRET)
                .header("X-User-Id", userId)
                .build();
    }

    @Test
    void user_can_query_paths() {
        identity.grant("USER");

        List<Path> paths = as(USER_ID).document(PATHS)
                .execute()
                .errors().verify()
                .path("paths").entityList(Path.class).get();

        assertThat(paths).isNotNull();
        assertThat(identity.lastRequest().getPath())
                .contains("/private/api/member/check")
                .contains("userId=" + USER_ID)
                .contains("serviceName=learn");
    }

    @Test
    void user_mutation_is_forbidden() {
        identity.grant("USER");

        as(USER_ID).document(CREATE_PATH)
                .variable("t", "Should not exist")
                .execute()
                .errors()
                .expect(e -> e.getErrorType() == ErrorType.FORBIDDEN)
                .expect(e -> e.getExtensions().containsKey("correlationId"))
                .verify();
    }

    @Test
    void admin_mutation_creates_draft_path() {
        identity.grant("ADMIN");

        Path created = as(USER_ID).document(CREATE_PATH)
                .variable("t", "Web Exploitation 101")
                .execute()
                .errors().verify()
                .path("upsertPath").entity(Path.class).get();

        assertThat(created.id()).isNotNull();
        assertThat(created.slug()).isEqualTo("web-exploitation-101");
        assertThat(created.status().name()).isEqualTo("DRAFT");
    }

    @Test
    void no_membership_is_forbidden() {
        identity.deny();

        as(USER_ID).document(PATHS)
                .execute()
                .errors()
                .expect(e -> e.getErrorType() == ErrorType.FORBIDDEN)
                .verify();
    }

    @Test
    void identity_outage_is_internal_error_without_leaking_details() {
        identity.fail(503);

        as(USER_ID).document(PATHS)
                .execute()
                .errors()
                .expect(e -> e.getErrorType() == ErrorType.INTERNAL_ERROR)
                .expect(e -> "internal server error".equals(e.getMessage()))
                .expect(e -> e.getExtensions().containsKey("correlationId"))
                .verify();
    }
}
