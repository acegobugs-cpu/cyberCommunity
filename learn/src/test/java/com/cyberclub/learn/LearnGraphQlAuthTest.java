package com.cyberclub.learn;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.graphql.execution.ErrorType;
import org.springframework.graphql.test.tester.HttpGraphQlTester;

import com.cyberclub.learn.dtos.domain.Course;

/**
 * Authorization matrix for the L0 baseline schema. Every resolver calls
 * identity for the caller's role; identity is faked per test.
 */
class LearnGraphQlAuthTest extends BaseIntegrationTest {

    private static final String COURSES = "{ courses { id title lessons { id title } } }";
    private static final String CREATE_COURSE =
        "mutation($t: String!, $d: String) { createCourse(title: $t, description: $d) { id title description } }";

    @Autowired
    private HttpGraphQlTester graphQl;

    /** Tester carrying the headers the gateway injects for an authenticated call. */
    private HttpGraphQlTester as(String userId) {
        return graphQl.mutate()
                .header("X-Internal-Auth", SECRET)
                .header("X-User-Id", userId)
                .build();
    }

    @Test
    void user_can_query_courses() {
        identity.grant("USER");

        List<Course> courses = as(USER_ID).document(COURSES)
                .execute()
                .errors().verify()
                .path("courses").entityList(Course.class).get();

        assertThat(courses).isNotNull();
        assertThat(identity.lastRequest().getPath())
                .contains("/private/api/member/check")
                .contains("userId=" + USER_ID)
                .contains("serviceName=learn");
    }

    @Test
    void user_mutation_is_forbidden() {
        identity.grant("USER");

        // createCourse is declared `Course!`, so on error GraphQL nulls the whole
        // `data` object; the error classification is the assertion that matters.
        as(USER_ID).document(CREATE_COURSE)
                .variable("t", "Should not exist")
                .execute()
                .errors()
                .expect(e -> e.getErrorType() == ErrorType.FORBIDDEN)
                .expect(e -> e.getExtensions().containsKey("correlationId"))
                .verify();
    }

    @Test
    void admin_mutation_creates_course_visible_to_users() {
        identity.grant("ADMIN");

        Course created = as(USER_ID).document(CREATE_COURSE)
                .variable("t", "Web Exploitation 101")
                .variable("d", "intro")
                .execute()
                .errors().verify()
                .path("createCourse").entity(Course.class).get();

        assertThat(created.id()).isNotNull();
        assertThat(created.title()).isEqualTo("Web Exploitation 101");

        identity.grant("USER");
        List<Course> courses = as(USER_ID).document(COURSES)
                .execute()
                .errors().verify()
                .path("courses").entityList(Course.class).get();

        assertThat(courses).extracting(Course::id).contains(created.id());
    }

    @Test
    void no_membership_is_forbidden() {
        identity.deny();

        as(USER_ID).document(COURSES)
                .execute()
                .errors()
                .expect(e -> e.getErrorType() == ErrorType.FORBIDDEN)
                .verify();
    }

    @Test
    void identity_outage_is_internal_error_without_leaking_details() {
        identity.fail(503);

        as(USER_ID).document(COURSES)
                .execute()
                .errors()
                .expect(e -> e.getErrorType() == ErrorType.INTERNAL_ERROR)
                .expect(e -> "internal server error".equals(e.getMessage()))
                .expect(e -> e.getExtensions().containsKey("correlationId"))
                .verify();
    }
}
