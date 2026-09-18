package com.cyberclub.learn;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.graphql.execution.ErrorType;
import org.springframework.graphql.test.tester.HttpGraphQlTester;

/**
 * L2 — enrollment & progress: implicit enroll, idempotent completion, the
 * module/path arithmetic (kept in PostgreSQL), completion cache, drop/revive,
 * and recompute when an author adds a lesson.
 */
class LearnProgressTest extends BaseIntegrationTest {

    private static final ParameterizedTypeReference<Map<String, Object>> MAP = new ParameterizedTypeReference<>() {};

    @Autowired
    private HttpGraphQlTester graphQl;

    private HttpGraphQlTester as(String role, String userId) {
        identity.grant(role);
        return graphQl.mutate().header("X-Internal-Auth", SECRET).header("X-User-Id", userId).build();
    }

    private HttpGraphQlTester admin() { return as("ADMIN", USER_ID); }
    private HttpGraphQlTester learner() { return as("USER", USER_ID); }

    // ---------------------------------------------------------------- fixture: 1 path, 2 modules, 2 + 1 lessons

    record Fixture(String pathId, String slug, String m1, String m2, String l1a, String l1b, String l2a) {}

    private Fixture publishedPath() {
        String slug = "prog-" + UUID.randomUUID().toString().substring(0, 8);
        String pathId = admin().document("mutation($s: String) { upsertPath(input: { title: \"Progress\", slug: $s }) { id } }")
            .variable("s", slug).execute().errors().verify().path("upsertPath.id").entity(String.class).get();
        String m1 = module(pathId, "M1");
        String m2 = module(pathId, "M2");
        String l1a = lesson(m1, "L1a");
        String l1b = lesson(m1, "L1b");
        String l2a = lesson(m2, "L2a");
        admin().document("mutation($id: ID!) { publishPath(id: $id) { status } }").variable("id", pathId).execute().errors().verify();
        return new Fixture(pathId, slug, m1, m2, l1a, l1b, l2a);
    }

    private String module(String pathId, String title) {
        return admin().document("mutation($p: ID!, $t: String!) { upsertModule(input: { pathId: $p, title: $t }) { id } }")
            .variable("p", pathId).variable("t", title).execute().errors().verify().path("upsertModule.id").entity(String.class).get();
    }

    private String lesson(String moduleId, String title) {
        return admin().document("mutation($m: ID!, $t: String!) { upsertLesson(input: { moduleId: $m, title: $t, type: READING, contentMd: \"x\" }) { id } }")
            .variable("m", moduleId).variable("t", title).execute().errors().verify().path("upsertLesson.id").entity(String.class).get();
    }

    private void complete(String lessonId) {
        learner().document("mutation($id: ID!) { completeLesson(lessonId: $id) { id completed } }")
            .variable("id", lessonId).execute().errors().verify()
            .path("completeLesson.completed").entity(Boolean.class).isEqualTo(true);
    }

    private Map<String, Object> view(String slug) {
        return learner().document("""
            query($s: String!) { path(slug: $s) {
              enrollment { status progress completedAt nextLessonId }
              modules { id lessons { id completed } myProgress { status progress completedAt } }
            } }""").variable("s", slug).execute().errors().verify().path("path").entity(MAP).get();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> enrollment(Map<String, Object> path) { return (Map<String, Object>) path.get("enrollment"); }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> moduleProgress(Map<String, Object> path, String moduleId) {
        for (Map<String, Object> m : (List<Map<String, Object>>) path.get("modules")) {
            if (moduleId.equals(m.get("id"))) return (Map<String, Object>) m.get("myProgress");
        }
        throw new AssertionError("module not in path");
    }

    private static double num(Object o) { return ((Number) o).doubleValue(); }

    // ---------------------------------------------------------------- tests

    @Test
    void completing_a_lesson_enrolls_implicitly_and_computes_progress() {
        Fixture f = publishedPath();
        assertThat(enrollment(view(f.slug()))).isNull();

        complete(f.l1a());

        Map<String, Object> p = view(f.slug());
        Map<String, Object> e = enrollment(p);
        assertThat(e.get("status")).isEqualTo("ENROLLED");
        // module 1: 1 of 2 lessons = 0.5; module 2: untouched = 0 → path = mean(0.5, 0) = 0.25
        assertThat(num(moduleProgress(p, f.m1()).get("progress"))).isCloseTo(0.5, within(1e-4));
        assertThat(moduleProgress(p, f.m1()).get("status")).isEqualTo("IN_PROGRESS");
        assertThat(moduleProgress(p, f.m2())).isNull();
        assertThat(num(e.get("progress"))).isCloseTo(0.25, within(1e-4));
        assertThat(e.get("nextLessonId")).isEqualTo(f.l1b());
    }

    @Test
    void completing_is_idempotent() {
        Fixture f = publishedPath();
        complete(f.l1a());
        complete(f.l1a());
        complete(f.l1a());

        Map<String, Object> p = view(f.slug());
        assertThat(num(moduleProgress(p, f.m1()).get("progress"))).isCloseTo(0.5, within(1e-4));
        assertThat(num(enrollment(p).get("progress"))).isCloseTo(0.25, within(1e-4));
    }

    @Test
    void finishing_every_lesson_completes_module_and_path_in_one_transaction() {
        Fixture f = publishedPath();
        complete(f.l1a());
        complete(f.l1b());

        Map<String, Object> p = view(f.slug());
        assertThat(moduleProgress(p, f.m1()).get("status")).isEqualTo("COMPLETED");
        assertThat(moduleProgress(p, f.m1()).get("completedAt")).isNotNull();
        assertThat(num(enrollment(p).get("progress"))).isCloseTo(0.5, within(1e-4));
        assertThat(enrollment(p).get("status")).isEqualTo("ENROLLED");

        complete(f.l2a());   // last lesson → path completion cache set by the same statement

        Map<String, Object> done = view(f.slug());
        assertThat(enrollment(done).get("status")).isEqualTo("COMPLETED");
        assertThat(enrollment(done).get("completedAt")).isNotNull();
        assertThat(num(enrollment(done).get("progress"))).isCloseTo(1.0, within(1e-4));
        assertThat(enrollment(done).get("nextLessonId")).isNull();
    }

    @Test
    void explicit_enroll_drop_and_revive() {
        Fixture f = publishedPath();

        learner().document("mutation($p: ID!) { enroll(pathId: $p) { status progress } }").variable("p", f.pathId())
            .execute().errors().verify()
            .path("enroll.status").entity(String.class).isEqualTo("ENROLLED")
            .path("enroll.progress").entity(Double.class).isEqualTo(0.0);

        // shows up in myEnrollments
        List<Map<String, Object>> mine = learner().document("{ myEnrollments { id } }")
            .execute().errors().verify().path("myEnrollments").entityList(MAP).get();
        assertThat(mine).extracting(m -> m.get("id")).contains(f.pathId());

        learner().document("mutation($p: ID!) { dropPath(pathId: $p) { status droppedAt } }").variable("p", f.pathId())
            .execute().errors().verify().path("dropPath.status").entity(String.class).isEqualTo("DROPPED");

        mine = learner().document("{ myEnrollments { id } }").execute().errors().verify().path("myEnrollments").entityList(MAP).get();
        assertThat(mine).extracting(m -> m.get("id")).doesNotContain(f.pathId());

        // dropping twice is a NOT_FOUND, re-enrolling revives
        learner().document("mutation($p: ID!) { dropPath(pathId: $p) { status } }").variable("p", f.pathId())
            .execute().errors().expect(e -> e.getErrorType() == ErrorType.NOT_FOUND).verify();
        learner().document("mutation($p: ID!) { enroll(pathId: $p) { status droppedAt } }").variable("p", f.pathId())
            .execute().errors().verify()
            .path("enroll.status").entity(String.class).isEqualTo("ENROLLED")
            .path("enroll.droppedAt").valueIsNull();
    }

    @Test
    void draft_paths_cannot_be_enrolled_and_only_reading_video_can_be_completed() {
        String slug = "draft-" + UUID.randomUUID().toString().substring(0, 8);
        String draft = admin().document("mutation($s: String) { upsertPath(input: { title: \"Draft\", slug: $s }) { id } }")
            .variable("s", slug).execute().errors().verify().path("upsertPath.id").entity(String.class).get();

        learner().document("mutation($p: ID!) { enroll(pathId: $p) { status } }").variable("p", draft)
            .execute().errors().expect(e -> e.getErrorType() == ErrorType.BAD_REQUEST).verify();

        Fixture f = publishedPath();
        String quiz = admin().document("mutation($m: ID!) { upsertLesson(input: { moduleId: $m, title: \"q\", type: QUIZ }) { id } }")
            .variable("m", f.m2()).execute().errors().verify().path("upsertLesson.id").entity(String.class).get();
        learner().document("mutation($id: ID!) { completeLesson(lessonId: $id) { id } }").variable("id", quiz)
            .execute().errors().expect(e -> e.getErrorType() == ErrorType.BAD_REQUEST).verify();
    }

    @Test
    void adding_a_lesson_recomputes_cached_progress() {
        Fixture f = publishedPath();
        complete(f.l1a());
        complete(f.l1b());
        assertThat(moduleProgress(view(f.slug()), f.m1()).get("status")).isEqualTo("COMPLETED");

        lesson(f.m1(), "L1c");   // author adds a third lesson

        Map<String, Object> p = view(f.slug());
        assertThat(num(moduleProgress(p, f.m1()).get("progress"))).isCloseTo(2.0 / 3.0, within(1e-4));
        assertThat(moduleProgress(p, f.m1()).get("status")).isEqualTo("IN_PROGRESS");
        assertThat(moduleProgress(p, f.m1()).get("completedAt")).isNull();
    }

    @Test
    void progress_is_per_user() {
        Fixture f = publishedPath();
        complete(f.l1a());

        String other = "22222222-2222-2222-2222-222222222222";
        Map<String, Object> theirs = as("USER", other).document("query($s: String!) { path(slug: $s) { enrollment { status } modules { lessons { completed } } } }")
            .variable("s", f.slug()).execute().errors().verify().path("path").entity(MAP).get();
        assertThat(enrollment(theirs)).isNull();
    }
}
