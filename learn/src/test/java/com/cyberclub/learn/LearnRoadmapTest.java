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
 * L3 — roadmaps: derived progress (ALL / CHOICE / non-required), learner
 * visibility of items whose target is unpublished, "my roadmaps", and the
 * setRoadmapItems validation rules.
 */
class LearnRoadmapTest extends BaseIntegrationTest {

    private static final ParameterizedTypeReference<Map<String, Object>> MAP = new ParameterizedTypeReference<>() {};
    private static final ParameterizedTypeReference<List<Map<String, Object>>> LIST = new ParameterizedTypeReference<>() {};

    @Autowired
    private HttpGraphQlTester graphQl;

    private HttpGraphQlTester as(String role, String userId) {
        identity.grant(role);
        return graphQl.mutate().header("X-Internal-Auth", SECRET).header("X-User-Id", userId).build();
    }

    private HttpGraphQlTester admin() { return as("ADMIN", USER_ID); }
    private HttpGraphQlTester learner() { return as("USER", USER_ID); }

    // ---------------------------------------------------------------- fixture helpers

    /** Published path with one module and {@code lessons} READING lessons; returns [pathId, moduleId, lessonId...]. */
    private List<String> path(int lessons, boolean publish) {
        String slug = "rm-" + UUID.randomUUID().toString().substring(0, 8);
        String pathId = admin().document("mutation($s: String) { upsertPath(input: { title: \"P\", slug: $s }) { id } }")
            .variable("s", slug).execute().errors().verify().path("upsertPath.id").entity(String.class).get();
        String moduleId = admin().document("mutation($p: ID!) { upsertModule(input: { pathId: $p, title: \"M\" }) { id } }")
            .variable("p", pathId).execute().errors().verify().path("upsertModule.id").entity(String.class).get();
        java.util.ArrayList<String> out = new java.util.ArrayList<>(List.of(pathId, moduleId));
        for (int i = 0; i < lessons; i++) {
            out.add(admin().document("mutation($m: ID!) { upsertLesson(input: { moduleId: $m, title: \"L\", type: READING, contentMd: \"x\" }) { id } }")
                .variable("m", moduleId).execute().errors().verify().path("upsertLesson.id").entity(String.class).get());
        }
        if (publish) {
            admin().document("mutation($id: ID!) { publishPath(id: $id) { status } }").variable("id", pathId).execute().errors().verify();
        }
        return out;
    }

    private void complete(String lessonId, String pathId) {
        learner().document("mutation($id: ID!, $p: ID!) { completeLesson(lessonId: $id, pathId: $p) { id } }")
            .variable("id", lessonId).variable("p", pathId).execute().errors().verify();
    }

    private String roadmap() {
        return admin().document("mutation($s: String) { upsertRoadmap(input: { title: \"Web Exploitation\", slug: $s }) { id slug status } }")
            .variable("s", "web-" + UUID.randomUUID().toString().substring(0, 8))
            .execute().errors().verify().path("upsertRoadmap.id").entity(String.class).get();
    }

    private static Map<String, Object> item(int position, String groupType, boolean required, String pathId, String moduleId) {
        java.util.HashMap<String, Object> m = new java.util.HashMap<>();
        m.put("position", position);
        m.put("groupType", groupType);
        m.put("isRequired", required);
        if (pathId != null) m.put("pathId", pathId);
        if (moduleId != null) m.put("moduleId", moduleId);
        return m;
    }

    private void setItems(String roadmapId, List<Map<String, Object>> items) {
        admin().document("mutation($r: ID!, $items: [RoadMapItemInput!]!) { setRoadmapItems(roadmapId: $r, items: $items) { id } }")
            .variable("r", roadmapId).variable("items", items).execute().errors().verify();
    }

    private void publish(String roadmapId) {
        admin().document("mutation($id: ID!) { publishRoadmap(id: $id) { status } }").variable("id", roadmapId)
            .execute().errors().verify().path("publishRoadmap.status").entity(String.class).isEqualTo("PUBLISHED");
    }

    private Map<String, Object> view(HttpGraphQlTester who, String roadmapId) {
        return who.document("""
            query($id: ID!) { roadmapById(id: $id) {
              progress
              items { position groupType isRequired progress item { __typename ... on Path { id slug } ... on Module { id paths { slug } } } }
            } }""").variable("id", roadmapId).execute().errors().verify().path("roadmapById").entity(MAP).get();
    }

    private static double num(Object o) { return ((Number) o).doubleValue(); }

    // ---------------------------------------------------------------- tests

    @Test
    void progress_is_mean_of_required_steps_with_choice_taking_the_best_item() {
        List<String> p1 = path(1, true);   // will be 1.0
        List<String> p2 = path(2, true);   // will be 0.5
        List<String> p3 = path(1, true);   // untouched → 0
        String r = roadmap();
        setItems(r, List.of(
            item(1, "ALL", true, p1.get(0), null),
            item(2, "CHOICE", true, p2.get(0), null),
            item(2, "CHOICE", true, p3.get(0), null),
            item(3, "ALL", false, null, p3.get(1))          // non-required module item → ignored by the %
        ));
        publish(r);

        assertThat(num(view(learner(), r).get("progress"))).isCloseTo(0.0, within(1e-4));

        complete(p1.get(2), p1.get(0));
        complete(p2.get(2), p2.get(0));

        Map<String, Object> v = view(learner(), r);
        // step1 = 1.0; step2 = max(0.5, 0) = 0.5; step3 is not required → ignored. mean = 0.75
        assertThat(num(v.get("progress"))).isCloseTo(0.75, within(1e-4));

        @SuppressWarnings("unchecked") List<Map<String, Object>> items = (List<Map<String, Object>>) v.get("items");
        assertThat(items).hasSize(4);
        assertThat(items).extracting(i -> i.get("position")).containsExactly(1, 2, 2, 3);
        assertThat(num(items.get(0).get("progress"))).isCloseTo(1.0, within(1e-4));
        assertThat(num(items.get(1).get("progress"))).isCloseTo(0.5, within(1e-4));
        @SuppressWarnings("unchecked") Map<String, Object> moduleTarget = (Map<String, Object>) items.get(3).get("item");
        assertThat(moduleTarget.get("__typename")).isEqualTo("Module");
        assertThat((List<?>) moduleTarget.get("paths")).hasSize(1);   // learner can reach it through p3
    }

    @Test
    void unpublished_path_inside_a_published_roadmap_is_hidden_from_learners() {
        List<String> shown = path(1, true);
        List<String> hidden = path(1, false);
        String r = roadmap();
        setItems(r, List.of(item(1, "ALL", true, shown.get(0), null), item(2, "ALL", true, hidden.get(0), null),
            item(3, "ALL", true, null, hidden.get(1))));   // module of the draft path is unreachable too
        publish(r);

        @SuppressWarnings("unchecked") List<Map<String, Object>> forLearner = (List<Map<String, Object>>) view(learner(), r).get("items");
        assertThat(forLearner).hasSize(1);
        @SuppressWarnings("unchecked") List<Map<String, Object>> forAdmin = (List<Map<String, Object>>) view(admin(), r).get("items");
        assertThat(forAdmin).hasSize(3);

        // draft roadmaps are invisible to learners altogether
        String draft = roadmap();
        setItems(draft, List.of(item(1, "ALL", true, shown.get(0), null)));
        learner().document("query($id: ID!) { roadmapById(id: $id) { id } }").variable("id", draft)
            .execute().errors().verify().path("roadmapById").valueIsNull();
        learner().document("{ roadmaps { id } }").execute().errors().verify()
            .path("roadmaps[*].id").entityList(String.class).satisfies(ids -> assertThat(ids).contains(r).doesNotContain(draft));
    }

    @Test
    void my_roadmaps_lists_only_those_the_learner_has_touched_most_advanced_first() {
        List<String> a = path(1, true);
        List<String> b = path(2, true);
        List<String> c = path(1, true);
        String r1 = roadmap(); setItems(r1, List.of(item(1, "ALL", true, a.get(0), null))); publish(r1);
        String r2 = roadmap(); setItems(r2, List.of(item(1, "ALL", true, b.get(0), null))); publish(r2);
        String r3 = roadmap(); setItems(r3, List.of(item(1, "ALL", true, c.get(0), null))); publish(r3);

        complete(b.get(2), b.get(0));   // r2 at 0.5
        complete(a.get(2), a.get(0));   // r1 at 1.0

        List<Map<String, Object>> mine = learner().document("{ myRoadmaps { id progress } }")
            .execute().errors().verify().path("myRoadmaps").entity(LIST).get();
        List<Object> ids = mine.stream().map(m -> m.get("id")).toList();
        assertThat(ids).containsSubsequence(r1, r2);
        assertThat(ids).doesNotContain(r3);
    }

    @Test
    void set_items_validates_and_renumbers_steps_densely() {
        List<String> p = path(1, true);
        List<String> q = path(1, true);
        String r = roadmap();

        // needs exactly one target
        admin().document("mutation($r: ID!, $items: [RoadMapItemInput!]!) { setRoadmapItems(roadmapId: $r, items: $items) { id } }")
            .variable("r", r).variable("items", List.of(item(1, "ALL", true, p.get(0), p.get(1))))
            .execute().errors().expect(e -> e.getErrorType() == ErrorType.BAD_REQUEST).verify();
        // same path twice
        admin().document("mutation($r: ID!, $items: [RoadMapItemInput!]!) { setRoadmapItems(roadmapId: $r, items: $items) { id } }")
            .variable("r", r).variable("items", List.of(item(1, "ALL", true, p.get(0), null), item(2, "ALL", true, p.get(0), null)))
            .execute().errors().expect(e -> e.getErrorType() == ErrorType.BAD_REQUEST).verify();
        // mixed group types in one step
        admin().document("mutation($r: ID!, $items: [RoadMapItemInput!]!) { setRoadmapItems(roadmapId: $r, items: $items) { id } }")
            .variable("r", r).variable("items", List.of(item(1, "ALL", true, p.get(0), null), item(1, "CHOICE", true, q.get(0), null)))
            .execute().errors().expect(e -> e.getErrorType() == ErrorType.BAD_REQUEST).verify();
        // unknown path
        admin().document("mutation($r: ID!, $items: [RoadMapItemInput!]!) { setRoadmapItems(roadmapId: $r, items: $items) { id } }")
            .variable("r", r).variable("items", List.of(item(1, "ALL", true, UUID.randomUUID().toString(), null)))
            .execute().errors().expect(e -> e.getErrorType() == ErrorType.NOT_FOUND).verify();

        // cannot publish empty
        admin().document("mutation($id: ID!) { publishRoadmap(id: $id) { status } }").variable("id", r)
            .execute().errors().expect(e -> e.getErrorType() == ErrorType.BAD_REQUEST).verify();

        // sparse positions become 1..n
        setItems(r, List.of(item(9, "ALL", true, q.get(0), null), item(4, "ALL", true, p.get(0), null)));
        @SuppressWarnings("unchecked") List<Map<String, Object>> items = (List<Map<String, Object>>) view(admin(), r).get("items");
        assertThat(items).extracting(i -> i.get("position")).containsExactly(1, 2);
        @SuppressWarnings("unchecked") Map<String, Object> first = (Map<String, Object>) items.get(0).get("item");
        assertThat(first.get("id")).isEqualTo(p.get(0));

        // USER may not author
        learner().document("mutation($s: String) { upsertRoadmap(input: { title: \"x\", slug: $s }) { id } }").variable("s", "nope-" + UUID.randomUUID())
            .execute().errors().expect(e -> e.getErrorType() == ErrorType.FORBIDDEN).verify();
    }
}
