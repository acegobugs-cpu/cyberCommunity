package com.cyberclub.learn;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.graphql.execution.ErrorType;
import org.springframework.graphql.test.tester.HttpGraphQlTester;

/**
 * L1 content rules: draft visibility, reorder validation, slug uniqueness,
 * publish guard, estimated-minutes cache.
 */
class LearnContentTest extends BaseIntegrationTest {

    @Autowired
    private HttpGraphQlTester graphQl;

    private HttpGraphQlTester admin() {
        identity.grant("ADMIN");
        return as();
    }

    private HttpGraphQlTester user() {
        identity.grant("USER");
        return as();
    }

    private HttpGraphQlTester as() {
        return graphQl.mutate().header("X-Internal-Auth", SECRET).header("X-User-Id", USER_ID).build();
    }

    // ---------- fixtures ----------

    private String createCourse(String title, String slug) {
        return admin().document("mutation($t: String!, $s: String) { upsertCourse(input: { title: $t, slug: $s }) { id } }")
                .variable("t", title).variable("s", slug)
                .execute().errors().verify()
                .path("upsertCourse.id").entity(String.class).get();
    }

    private String createModule(String courseId, String title) {
        return admin().document("mutation($c: ID!, $t: String!) { upsertModule(input: { courseId: $c, title: $t }) { id position } }")
                .variable("c", courseId).variable("t", title)
                .execute().errors().verify()
                .path("upsertModule.id").entity(String.class).get();
    }

    private String createLesson(String moduleId, String title, int minutes) {
        return admin().document("""
                mutation($m: ID!, $t: String!, $min: Int) {
                  upsertLesson(input: { moduleId: $m, title: $t, type: READING, contentMd: "# hi", estimatedMinutes: $min }) { id position }
                }""")
                .variable("m", moduleId).variable("t", title).variable("min", minutes)
                .execute().errors().verify()
                .path("upsertLesson.id").entity(String.class).get();
    }

    private void publish(String courseId) {
        admin().document("mutation($id: ID!) { publishCourse(id: $id) { status } }")
                .variable("id", courseId).execute().errors().verify()
                .path("publishCourse.status").entity(String.class).isEqualTo("PUBLISHED");
    }

    // ---------- visibility ----------

    @Test
    void unpublished_course_is_hidden_from_user_but_visible_to_admin() {
        String slug = "draft-" + UUID.randomUUID().toString().substring(0, 8);
        String id = createCourse("Draft course", slug);
        String moduleId = createModule(id, "M1");
        String lessonId = createLesson(moduleId, "L1", 5);

        // USER: catalogue, by slug, by id, lesson → all hidden
        List<Map<String, Object>> userCourses = user().document("{ courses { slug } }")
                .execute().errors().verify().path("courses").entityList(new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {}).get();
        assertThat(userCourses).extracting(c -> c.get("slug")).doesNotContain(slug);

        user().document("query($s: String!) { course(slug: $s) { id } }").variable("s", slug)
                .execute().errors().verify().path("course").valueIsNull();
        user().document("query($id: ID!) { courseById(id: $id) { id } }").variable("id", id)
                .execute().errors().verify().path("courseById").valueIsNull();
        user().document("query($id: ID!) { lesson(id: $id) { id } }").variable("id", lessonId)
                .execute().errors().verify().path("lesson").valueIsNull();

        // ADMIN sees everything, including nested content
        admin().document("query($s: String!) { course(slug: $s) { id status modules { lessons { id } } } }").variable("s", slug)
                .execute().errors().verify()
                .path("course.status").entity(String.class).isEqualTo("DRAFT")
                .path("course.modules[0].lessons[0].id").entity(String.class).isEqualTo(lessonId);

        // after publishing, the USER sees it
        publish(id);
        user().document("query($s: String!) { course(slug: $s) { id modules { lessons { id } } } }").variable("s", slug)
                .execute().errors().verify()
                .path("course.modules[0].lessons[0].id").entity(String.class).isEqualTo(lessonId);
        user().document("query($id: ID!) { lesson(id: $id) { title } }").variable("id", lessonId)
                .execute().errors().verify().path("lesson.title").entity(String.class).isEqualTo("L1");
    }

    // ---------- slug ----------

    @Test
    void duplicate_slug_is_bad_request() {
        String slug = "dup-" + UUID.randomUUID().toString().substring(0, 8);
        createCourse("First", slug);

        admin().document("mutation($s: String) { upsertCourse(input: { title: \"Second\", slug: $s }) { id } }")
                .variable("s", slug)
                .execute().errors()
                .expect(e -> e.getErrorType() == ErrorType.BAD_REQUEST)
                .expect(e -> e.getMessage().contains("slug already in use"))
                .verify();
    }

    @Test
    void invalid_slug_is_bad_request() {
        admin().document("mutation { upsertCourse(input: { title: \"x\", slug: \"Not A Slug!\" }) { id } }")
                .execute().errors()
                .expect(e -> e.getErrorType() == ErrorType.BAD_REQUEST)
                .verify();
    }

    // ---------- reorder ----------

    @Test
    void reorder_modules_swaps_positions_and_rejects_bad_sets() {
        String id = createCourse("Reorder", "reorder-" + UUID.randomUUID().toString().substring(0, 8));
        String a = createModule(id, "A");
        String b = createModule(id, "B");
        String c = createModule(id, "C");

        // valid: reverse
        List<Map<String, Object>> after = admin()
                .document("mutation($c: ID!, $ids: [ID!]!) { reorderModules(courseId: $c, orderedIds: $ids) { modules { id position } } }")
                .variable("c", id).variable("ids", List.of(c, b, a))
                .execute().errors().verify()
                .path("reorderModules.modules").entityList(new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {}).get();
        assertThat(after).extracting(m -> m.get("id")).containsExactly(c, b, a);
        assertThat(after).extracting(m -> m.get("position")).containsExactly(1, 2, 3);

        // missing one id
        admin().document("mutation($c: ID!, $ids: [ID!]!) { reorderModules(courseId: $c, orderedIds: $ids) { id } }")
                .variable("c", id).variable("ids", List.of(a, b))
                .execute().errors().expect(e -> e.getErrorType() == ErrorType.BAD_REQUEST).verify();

        // duplicate id
        admin().document("mutation($c: ID!, $ids: [ID!]!) { reorderModules(courseId: $c, orderedIds: $ids) { id } }")
                .variable("c", id).variable("ids", List.of(a, a, b))
                .execute().errors().expect(e -> e.getErrorType() == ErrorType.BAD_REQUEST).verify();

        // foreign id
        admin().document("mutation($c: ID!, $ids: [ID!]!) { reorderModules(courseId: $c, orderedIds: $ids) { id } }")
                .variable("c", id).variable("ids", List.of(a, b, UUID.randomUUID().toString()))
                .execute().errors().expect(e -> e.getErrorType() == ErrorType.BAD_REQUEST).verify();

        // USER may not reorder
        user().document("mutation($c: ID!, $ids: [ID!]!) { reorderModules(courseId: $c, orderedIds: $ids) { id } }")
                .variable("c", id).variable("ids", List.of(a, b, c))
                .execute().errors().expect(e -> e.getErrorType() == ErrorType.FORBIDDEN).verify();
    }

    // ---------- publish guard & cache ----------

    @Test
    void publish_requires_a_module_and_minutes_are_summed() {
        String id = createCourse("Guard", "guard-" + UUID.randomUUID().toString().substring(0, 8));

        admin().document("mutation($id: ID!) { publishCourse(id: $id) { status } }").variable("id", id)
                .execute().errors().expect(e -> e.getErrorType() == ErrorType.BAD_REQUEST).verify();

        String m = createModule(id, "M");
        createLesson(m, "L1", 10);
        createLesson(m, "L2", 25);

        admin().document("query($id: ID!) { courseById(id: $id) { estimatedMinutes } }").variable("id", id)
                .execute().errors().verify()
                .path("courseById.estimatedMinutes").entity(Integer.class).isEqualTo(35);

        publish(id);
    }

    @Test
    void video_lesson_requires_url() {
        String id = createCourse("Video", "video-" + UUID.randomUUID().toString().substring(0, 8));
        String m = createModule(id, "M");

        admin().document("mutation($m: ID!) { upsertLesson(input: { moduleId: $m, title: \"v\", type: VIDEO }) { id } }")
                .variable("m", m)
                .execute().errors()
                .expect(e -> e.getErrorType() == ErrorType.BAD_REQUEST)
                .expect(e -> e.getMessage().contains("videoUrl"))
                .verify();
    }
}
