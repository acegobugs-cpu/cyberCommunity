package com.cyberclub.learn;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.graphql.execution.ErrorType;
import org.springframework.graphql.test.tester.HttpGraphQlTester;

/**
 * L4 — quizzes: grading table (single / multi / partial), pass-threshold
 * boundary, the answer key never reaching a USER, append-only attempts with
 * best-attempt semantics, publish guard, and the pass → lesson completed hook.
 */
class LearnQuizTest extends BaseIntegrationTest {

    private static final ParameterizedTypeReference<Map<String, Object>> MAP = new ParameterizedTypeReference<>() {};

    @Autowired
    private HttpGraphQlTester graphQl;

    private HttpGraphQlTester as(String role, String userId) {
        identity.grant(role);
        return graphQl.mutate().header("X-Internal-Auth", SECRET).header("X-User-Id", userId).build();
    }

    private HttpGraphQlTester admin() { return as("ADMIN", USER_ID); }
    private HttpGraphQlTester learner() { return as("USER", USER_ID); }

    // ---------------------------------------------------------------- fixture

    /**
     * Published path → module → [READING lesson, QUIZ lesson]. Quiz (pass 70):
     *   q1 SINGLE 1pt  options A*,B
     *   q2 MULTI  2pt  options C*,D*,E
     *   q3 SINGLE 2pt  options F,G*
     * total 5 points. Returns ids by name.
     */
    private Map<String, String> fixture(int passScore) {
        java.util.HashMap<String, String> ids = new java.util.HashMap<>();
        String slug = "quiz-" + UUID.randomUUID().toString().substring(0, 8);
        ids.put("slug", slug);
        String pathId = admin().document("mutation($s: String) { upsertPath(input: { title: \"Q\", slug: $s }) { id } }")
            .variable("s", slug).execute().errors().verify().path("upsertPath.id").entity(String.class).get();
        ids.put("path", pathId);
        String moduleId = admin().document("mutation($p: ID!) { upsertModule(input: { pathId: $p, title: \"M\" }) { id } }")
            .variable("p", pathId).execute().errors().verify().path("upsertModule.id").entity(String.class).get();
        ids.put("module", moduleId);
        ids.put("reading", admin().document("mutation($m: ID!) { upsertLesson(input: { moduleId: $m, title: \"R\", type: READING, contentMd: \"x\" }) { id } }")
            .variable("m", moduleId).execute().errors().verify().path("upsertLesson.id").entity(String.class).get());
        String quizLesson = admin().document("mutation($m: ID!) { upsertLesson(input: { moduleId: $m, title: \"Quiz\", type: QUIZ }) { id } }")
            .variable("m", moduleId).execute().errors().verify().path("upsertLesson.id").entity(String.class).get();
        ids.put("lesson", quizLesson);

        Map<String, Object> quiz = admin().document("""
            mutation($l: ID!, $pass: Int) {
              upsertQuiz(input: { lessonId: $l, passScore: $pass, questions: [
                { promptMd: "q1", kind: SINGLE, points: 1, options: [{ textMd: "A", correct: true }, { textMd: "B" }] },
                { promptMd: "q2", kind: MULTI,  points: 2, options: [{ textMd: "C", correct: true }, { textMd: "D", correct: true }, { textMd: "E" }] },
                { promptMd: "q3", kind: SINGLE, points: 2, options: [{ textMd: "F" }, { textMd: "G", correct: true }] }
              ] }) { id passScore questions { id promptMd options { id textMd correct } } }
            }""").variable("l", quizLesson).variable("pass", passScore)
            .execute().errors().verify().path("upsertQuiz").entity(MAP).get();
        ids.put("quiz", (String) quiz.get("id"));
        @SuppressWarnings("unchecked") List<Map<String, Object>> qs = (List<Map<String, Object>>) quiz.get("questions");
        for (Map<String, Object> q : qs) {
            ids.put((String) q.get("promptMd"), (String) q.get("id"));
            @SuppressWarnings("unchecked") List<Map<String, Object>> os = (List<Map<String, Object>>) q.get("options");
            for (Map<String, Object> o : os) {
                ids.put((String) o.get("textMd"), (String) o.get("id"));
                assertThat(o.get("correct")).as("author sees the key").isNotNull();
            }
        }
        admin().document("mutation($id: ID!) { publishPath(id: $id) { status } }").variable("id", pathId).execute().errors().verify();
        return ids;
    }

    private static Map<String, Object> answer(Map<String, String> ids, String question, String... options) {
        return Map.of("questionId", ids.get(question), "optionIds", java.util.Arrays.stream(options).map(ids::get).toList());
    }

    private Map<String, Object> submit(Map<String, String> ids, List<Map<String, Object>> answers) {
        return learner().document("""
            mutation($q: ID!, $a: [AnswerInput!]!, $p: ID!) {
              submitQuiz(quizId: $q, answers: $a, pathId: $p) { id score passed results { questionId correct pointsEarned points } }
            }""").variable("q", ids.get("quiz")).variable("a", answers).variable("p", ids.get("path"))
            .execute().errors().verify().path("submitQuiz").entity(MAP).get();
    }

    private Map<String, Object> lessonView(Map<String, String> ids) {
        return learner().document("""
            query($id: ID!) { lesson(id: $id) {
              completed
              quiz { passScore myAttemptCount attemptCount passedCount
                     myBestAttempt { score passed }
                     questions { kind options { textMd correct } } }
            } }""").variable("id", ids.get("lesson")).execute().errors().verify().path("lesson").entity(MAP).get();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> quiz(Map<String, Object> lesson) { return (Map<String, Object>) lesson.get("quiz"); }

    // ---------------------------------------------------------------- tests

    @Test
    void grading_table_single_multi_and_partial() {
        Map<String, String> ids = fixture(70);

        // all right → 100
        assertThat(submit(ids, List.of(answer(ids, "q1", "A"), answer(ids, "q2", "C", "D"), answer(ids, "q3", "G"))).get("score")).isEqualTo(100);
        // MULTI partial set (C only) → 0 for q2; q1 + q3 right → 3/5 = 60
        Map<String, Object> partial = submit(ids, List.of(answer(ids, "q1", "A"), answer(ids, "q2", "C"), answer(ids, "q3", "G")));
        assertThat(partial.get("score")).isEqualTo(60);
        // MULTI superset (C, D, E) → 0 for q2 as well
        assertThat(submit(ids, List.of(answer(ids, "q1", "A"), answer(ids, "q2", "C", "D", "E"), answer(ids, "q3", "G"))).get("score")).isEqualTo(60);
        // SINGLE with two options chosen → wrong even if one is right
        assertThat(submit(ids, List.of(answer(ids, "q1", "A", "B"), answer(ids, "q2", "C", "D"), answer(ids, "q3", "G"))).get("score")).isEqualTo(80);
        // unanswered question counts as wrong; only q2 right → 2/5 = 40
        assertThat(submit(ids, List.of(answer(ids, "q2", "C", "D"))).get("score")).isEqualTo(40);
        // nothing → 0
        assertThat(submit(ids, List.of()).get("score")).isEqualTo(0);

        // per-question results are reported without leaking the key
        @SuppressWarnings("unchecked") List<Map<String, Object>> results = (List<Map<String, Object>>) partial.get("results");
        assertThat(results).extracting(r -> r.get("correct")).containsExactly(true, false, true);
        assertThat(results).extracting(r -> r.get("pointsEarned")).containsExactly(1, 0, 2);

        // invalid answers are rejected, not silently ignored
        learner().document("mutation($q: ID!, $a: [AnswerInput!]!) { submitQuiz(quizId: $q, answers: $a) { id } }")
            .variable("q", ids.get("quiz")).variable("a", List.of(Map.of("questionId", ids.get("q1"), "optionIds", List.of(ids.get("C")))))
            .execute().errors().expect(e -> e.getErrorType() == ErrorType.BAD_REQUEST).verify();
    }

    @Test
    void pass_threshold_boundary_flips_lesson_to_completed() {
        Map<String, String> ids = fixture(60);   // 60 % needed; 3/5 = 60 exactly
        assertThat(lessonView(ids).get("completed")).isEqualTo(false);

        Map<String, Object> below = submit(ids, List.of(answer(ids, "q2", "C", "D")));            // 40
        assertThat(below.get("passed")).isEqualTo(false);
        assertThat(lessonView(ids).get("completed")).isEqualTo(false);

        Map<String, Object> exact = submit(ids, List.of(answer(ids, "q1", "A"), answer(ids, "q3", "G")));   // 60 → passed (>=)
        assertThat(exact.get("score")).isEqualTo(60);
        assertThat(exact.get("passed")).isEqualTo(true);

        Map<String, Object> lesson = lessonView(ids);
        assertThat(lesson.get("completed")).isEqualTo(true);
        // and the path progress moved: 1 of 2 lessons in the only module → 0.5
        Map<String, Object> path = learner().document("query($s: String!) { path(slug: $s) { enrollment { status progress } } }")
            .variable("s", ids.get("slug")).execute().errors().verify().path("path").entity(MAP).get();
        @SuppressWarnings("unchecked") Map<String, Object> e = (Map<String, Object>) path.get("enrollment");
        assertThat(e.get("status")).isEqualTo("ENROLLED");
        assertThat(((Number) e.get("progress")).doubleValue()).isEqualTo(0.5);
    }

    @Test
    void correct_is_never_serialised_for_a_user_and_author_counters_are_hidden() {
        Map<String, String> ids = fixture(70);
        submit(ids, List.of(answer(ids, "q1", "A"), answer(ids, "q2", "C", "D"), answer(ids, "q3", "G")));   // even after passing

        Map<String, Object> q = quiz(lessonView(ids));
        @SuppressWarnings("unchecked") List<Map<String, Object>> questions = (List<Map<String, Object>>) q.get("questions");
        for (Map<String, Object> question : questions) {
            @SuppressWarnings("unchecked") List<Map<String, Object>> options = (List<Map<String, Object>>) question.get("options");
            assertThat(options).allSatisfy(o -> assertThat(o.get("correct")).isNull());
        }
        assertThat(q.get("attemptCount")).isNull();
        assertThat(q.get("passedCount")).isNull();
        assertThat(q.get("myAttemptCount")).isEqualTo(1);

        // the author sees both the key and the counters
        Map<String, Object> forAuthor = admin().document("query($id: ID!) { lesson(id: $id) { quiz { attemptCount passedCount questions { options { correct } } } } }")
            .variable("id", ids.get("lesson")).execute().errors().verify().path("lesson.quiz").entity(MAP).get();
        assertThat(forAuthor.get("attemptCount")).isEqualTo(1);
        assertThat(forAuthor.get("passedCount")).isEqualTo(1);
        @SuppressWarnings("unchecked") List<Map<String, Object>> aq = (List<Map<String, Object>>) forAuthor.get("questions");
        @SuppressWarnings("unchecked") List<Map<String, Object>> ao = (List<Map<String, Object>>) aq.get(0).get("options");
        assertThat(ao).extracting(o -> o.get("correct")).containsExactly(true, false);
    }

    @Test
    void attempts_are_append_only_and_best_attempt_wins() {
        Map<String, String> ids = fixture(70);
        submit(ids, List.of(answer(ids, "q1", "A")));                                                       // 20
        submit(ids, List.of(answer(ids, "q1", "A"), answer(ids, "q2", "C", "D"), answer(ids, "q3", "G")));  // 100 → pass
        submit(ids, List.of(answer(ids, "q3", "G")));                                                       // 40, after passing

        Map<String, Object> q = quiz(lessonView(ids));
        assertThat(q.get("myAttemptCount")).isEqualTo(3);
        @SuppressWarnings("unchecked") Map<String, Object> best = (Map<String, Object>) q.get("myBestAttempt");
        assertThat(best.get("score")).isEqualTo(100);
        assertThat(best.get("passed")).isEqualTo(true);
        assertThat(lessonView(ids).get("completed")).as("a later worse attempt does not un-complete").isEqualTo(true);

        // rebuilding the quiz keeps history
        admin().document("""
            mutation($l: ID!) { upsertQuiz(input: { lessonId: $l, passScore: 50, questions: [
              { promptMd: "new", options: [{ textMd: "yes", correct: true }, { textMd: "no" }] } ] }) { id } }""")
            .variable("l", ids.get("lesson")).execute().errors().verify();
        assertThat(quiz(lessonView(ids)).get("myAttemptCount")).isEqualTo(3);
    }

    @Test
    void publish_guard_and_author_validation() {
        String slug = "guard-" + UUID.randomUUID().toString().substring(0, 8);
        String pathId = admin().document("mutation($s: String) { upsertPath(input: { title: \"G\", slug: $s }) { id } }")
            .variable("s", slug).execute().errors().verify().path("upsertPath.id").entity(String.class).get();
        String moduleId = admin().document("mutation($p: ID!) { upsertModule(input: { pathId: $p, title: \"M\" }) { id } }")
            .variable("p", pathId).execute().errors().verify().path("upsertModule.id").entity(String.class).get();
        String quizLesson = admin().document("mutation($m: ID!) { upsertLesson(input: { moduleId: $m, title: \"Quiz\", type: QUIZ }) { id } }")
            .variable("m", moduleId).execute().errors().verify().path("upsertLesson.id").entity(String.class).get();

        // QUIZ lesson without a quiz blocks publishing
        admin().document("mutation($id: ID!) { publishPath(id: $id) { status } }").variable("id", pathId)
            .execute().errors().expect(e -> e.getErrorType() == ErrorType.BAD_REQUEST).verify();

        // SINGLE with two correct options is rejected
        admin().document("""
            mutation($l: ID!) { upsertQuiz(input: { lessonId: $l, questions: [
              { promptMd: "q", kind: SINGLE, options: [{ textMd: "a", correct: true }, { textMd: "b", correct: true }] } ] }) { id } }""")
            .variable("l", quizLesson).execute().errors().expect(e -> e.getErrorType() == ErrorType.BAD_REQUEST).verify();
        // one option only
        admin().document("""
            mutation($l: ID!) { upsertQuiz(input: { lessonId: $l, questions: [
              { promptMd: "q", options: [{ textMd: "a", correct: true }] } ] }) { id } }""")
            .variable("l", quizLesson).execute().errors().expect(e -> e.getErrorType() == ErrorType.BAD_REQUEST).verify();
        // quiz on a READING lesson
        String reading = admin().document("mutation($m: ID!) { upsertLesson(input: { moduleId: $m, title: \"R\", type: READING, contentMd: \"x\" }) { id } }")
            .variable("m", moduleId).execute().errors().verify().path("upsertLesson.id").entity(String.class).get();
        admin().document("""
            mutation($l: ID!) { upsertQuiz(input: { lessonId: $l, questions: [
              { promptMd: "q", options: [{ textMd: "a", correct: true }, { textMd: "b" }] } ] }) { id } }""")
            .variable("l", reading).execute().errors().expect(e -> e.getErrorType() == ErrorType.BAD_REQUEST).verify();
        // USER may not author
        learner().document("""
            mutation($l: ID!) { upsertQuiz(input: { lessonId: $l, questions: [
              { promptMd: "q", options: [{ textMd: "a", correct: true }, { textMd: "b" }] } ] }) { id } }""")
            .variable("l", quizLesson).execute().errors().expect(e -> e.getErrorType() == ErrorType.FORBIDDEN).verify();

        // a valid quiz unblocks publishing; completeLesson still refuses QUIZ lessons
        admin().document("""
            mutation($l: ID!) { upsertQuiz(input: { lessonId: $l, questions: [
              { promptMd: "q", options: [{ textMd: "a", correct: true }, { textMd: "b" }] } ] }) { id } }""")
            .variable("l", quizLesson).execute().errors().verify();
        admin().document("mutation($id: ID!) { publishPath(id: $id) { status } }").variable("id", pathId)
            .execute().errors().verify().path("publishPath.status").entity(String.class).isEqualTo("PUBLISHED");
        learner().document("mutation($id: ID!) { completeLesson(lessonId: $id) { id } }").variable("id", quizLesson)
            .execute().errors().expect(e -> e.getErrorType() == ErrorType.BAD_REQUEST).verify();
    }
}
