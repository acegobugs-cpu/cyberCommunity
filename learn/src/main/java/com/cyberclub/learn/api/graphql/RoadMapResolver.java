package com.cyberclub.learn.api.graphql;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.BatchMapping;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import graphql.GraphQLContext;

import com.cyberclub.learn.dtos.domain.Module;
import com.cyberclub.learn.dtos.domain.Path;
import com.cyberclub.learn.dtos.domain.RoadMap;
import com.cyberclub.learn.dtos.domain.RoadMapItem;
import com.cyberclub.learn.dtos.inputs.RoadMapInput;
import com.cyberclub.learn.dtos.inputs.RoadMapItemInput;
import com.cyberclub.learn.security.Policies;
import com.cyberclub.learn.services.AuthService;
import com.cyberclub.learn.services.ModuleService;
import com.cyberclub.learn.services.PathService;
import com.cyberclub.learn.services.RoadMapService;

/**
 * Roadmaps (L3). Progress fields are caller-scoped and derived from L2 state;
 * item visibility for learners follows the target's published state.
 */
@Controller
public class RoadMapResolver {

    private final AuthService auth;
    private final RoadMapService roadmaps;
    private final PathService paths;
    private final ModuleService modules;

    public RoadMapResolver(AuthService auth, RoadMapService roadmaps, PathService paths, ModuleService modules) {
        this.auth = auth;
        this.roadmaps = roadmaps;
        this.paths = paths;
        this.modules = modules;
    }

    // ---------------------------------------------------------------- queries

    @QueryMapping
    public List<RoadMap> roadmaps(@Argument String search, GraphQLContext ctx) {
        return roadmaps.list(search, Access.learnerSeesDrafts(auth, ctx));
    }

    @QueryMapping
    public RoadMap roadmap(@Argument String slug, GraphQLContext ctx) {
        return roadmaps.bySlug(slug, Access.learnerSeesDrafts(auth, ctx));
    }

    @QueryMapping
    public RoadMap roadmapById(@Argument UUID id, GraphQLContext ctx) {
        return roadmaps.byId(id, Access.learnerSeesDrafts(auth, ctx));
    }

    @QueryMapping
    public List<RoadMap> myRoadmaps(GraphQLContext ctx) {
        Access.learnerSeesDrafts(auth, ctx);
        return roadmaps.mine();
    }

    // ---------------------------------------------------------------- nested fields

    @BatchMapping(typeName = "RoadMap", field = "items")
    public Map<RoadMap, List<RoadMapItem>> items(List<RoadMap> parents, GraphQLContext ctx) {
        return roadmaps.itemsFor(parents, Access.drafts(ctx));
    }

    @BatchMapping(typeName = "RoadMap", field = "progress")
    public Map<RoadMap, Double> progress(List<RoadMap> parents) {
        Map<UUID, Double> byId = roadmaps.progressFor(parents);
        return parents.stream().collect(Collectors.toMap(Function.identity(), r -> byId.getOrDefault(r.id(), 0.0)));
    }

    @BatchMapping(typeName = "RoadMapItem", field = "progress")
    public Map<RoadMapItem, Double> itemProgress(List<RoadMapItem> parents) {
        Map<UUID, Double> byId = roadmaps.itemProgressFor(parents);
        return parents.stream().collect(Collectors.toMap(Function.identity(), i -> byId.getOrDefault(i.id(), 0.0)));
    }

    /** Union target. Items were already filtered for visibility by {@link #items}. */
    @BatchMapping(typeName = "RoadMapItem", field = "item")
    public Map<RoadMapItem, Object> item(List<RoadMapItem> parents) {
        Map<UUID, Path> pathById = paths.byIds(parents.stream().map(RoadMapItem::pathId).filter(id -> id != null).toList());
        Map<UUID, Module> moduleById = modules.byIds(parents.stream().map(RoadMapItem::moduleId).filter(id -> id != null).toList());
        return parents.stream()
            .map(i -> Map.entry(i, i.pathId() != null ? (Object) pathById.get(i.pathId()) : moduleById.get(i.moduleId())))
            .filter(e -> e.getValue() != null)
            .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    // ---------------------------------------------------------------- author mutations

    @MutationMapping
    public RoadMap upsertRoadmap(@Argument RoadMapInput input, GraphQLContext ctx) {
        auth.require(Policies.CONTENT_AUTHOR);
        ctx.put(Access.DRAFTS, true);
        return roadmaps.upsert(input);
    }

    @MutationMapping
    public RoadMap setRoadmapItems(@Argument UUID roadmapId, @Argument List<RoadMapItemInput> items, GraphQLContext ctx) {
        auth.require(Policies.CONTENT_AUTHOR);
        ctx.put(Access.DRAFTS, true);
        return roadmaps.setItems(roadmapId, items);
    }

    @MutationMapping
    public RoadMap publishRoadmap(@Argument UUID id, @Argument Boolean published, GraphQLContext ctx) {
        auth.require(Policies.CONTENT_AUTHOR);
        ctx.put(Access.DRAFTS, true);
        return roadmaps.publish(id, published == null || published);
    }

    @MutationMapping
    public RoadMap archiveRoadmap(@Argument UUID id, GraphQLContext ctx) {
        auth.require(Policies.CONTENT_AUTHOR);
        ctx.put(Access.DRAFTS, true);
        return roadmaps.archive(id);
    }

    @MutationMapping
    public boolean deleteRoadmap(@Argument UUID id) {
        auth.require(Policies.CONTENT_AUTHOR);
        return roadmaps.delete(id);
    }
}
