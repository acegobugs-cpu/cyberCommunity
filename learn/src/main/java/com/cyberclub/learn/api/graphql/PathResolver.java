package com.cyberclub.learn.api.graphql;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.BatchMapping;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import graphql.GraphQLContext;

import com.cyberclub.learn.context.UserContext;
import com.cyberclub.learn.dtos.AuthResult;
import com.cyberclub.learn.dtos.domain.Path;
import com.cyberclub.learn.dtos.domain.Difficulty;
import com.cyberclub.learn.dtos.domain.Module;
import com.cyberclub.learn.dtos.inputs.PathInput;
import com.cyberclub.learn.security.Policies;
import com.cyberclub.learn.services.AuthService;
import com.cyberclub.learn.services.PathService;
import com.cyberclub.learn.services.ModuleService;

@Controller
public class PathResolver {

    private final AuthService auth;
    private final PathService paths;
    private final ModuleService modules;

    public PathResolver(AuthService auth, PathService paths, ModuleService modules) {
        this.auth = auth;
        this.paths = paths;
        this.modules = modules;
    }

    // ---------- queries ----------

    /** Who am I in learn? Used by the frontend to gate authoring UI. */
    @QueryMapping
    public Me me() {
        AuthResult r = auth.require(Policies.LEARNER);
        return new Me(UserContext.getUserId(), r.role(), "ADMIN".equals(r.role()) || "AUTHOR".equals(r.role()));
    }

    public record Me(UUID userId, String role, boolean canAuthor) {}

    @QueryMapping
    public List<Path> paths(@Argument Difficulty difficulty, @Argument String tag, @Argument String search, GraphQLContext ctx) {
        boolean drafts = Access.learnerSeesDrafts(auth, ctx);
        return paths.list(difficulty, tag, search, drafts);
    }

    @QueryMapping
    public Path path(@Argument String slug, GraphQLContext ctx) {
        boolean drafts = Access.learnerSeesDrafts(auth, ctx);
        return paths.bySlug(slug, drafts);
    }

    @QueryMapping
    public Path pathById(@Argument UUID id, GraphQLContext ctx) {
        boolean drafts = Access.learnerSeesDrafts(auth, ctx);
        return paths.byId(id, drafts);
    }

    /** Parent resolvers already authorized and filtered; no extra identity call here. */
    @BatchMapping(typeName = "Path", field = "modules")
    public Map<Path, List<Module>> modules(List<Path> parents) {
        return modules.forPaths(parents);
    }

    /** Paths that include each module; learners see published ones only (decision taken by the top-level resolver). */
    @BatchMapping(typeName = "Module", field = "paths")
    public Map<Module, List<Path>> modulePaths(List<Module> parents, GraphQLContext ctx) {
        return paths.containing(parents, Access.drafts(ctx));
    }

    // ---------- author mutations ----------

    @MutationMapping
    public Path upsertPath(@Argument PathInput input) {
        auth.require(Policies.CONTENT_AUTHOR);
        return paths.upsert(input);
    }

    @MutationMapping
    public Path publishPath(@Argument UUID id, @Argument Boolean published) {
        auth.require(Policies.CONTENT_AUTHOR);
        return paths.publish(id, published == null || published);
    }

    @MutationMapping
    public Path archivePath(@Argument UUID id) {
        auth.require(Policies.CONTENT_AUTHOR);
        return paths.archive(id);
    }

    @MutationMapping
    public Path reorderModules(@Argument UUID pathId, @Argument List<UUID> orderedIds) {
        auth.require(Policies.CONTENT_AUTHOR);
        modules.reorder(pathId, orderedIds);
        return paths.byId(pathId, true);
    }

    @MutationMapping
    public Path addModuleToPath(@Argument UUID pathId, @Argument UUID moduleId) {
        auth.require(Policies.CONTENT_AUTHOR);
        modules.addToPath(pathId, moduleId);
        return paths.byId(pathId, true);
    }

    @MutationMapping
    public Path removeModuleFromPath(@Argument UUID pathId, @Argument UUID moduleId) {
        auth.require(Policies.CONTENT_AUTHOR);
        modules.removeFromPath(pathId, moduleId);
        return paths.byId(pathId, true);
    }
}
