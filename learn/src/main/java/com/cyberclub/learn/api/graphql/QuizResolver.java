package com.cyberclub.learn.api.graphql;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.BatchMapping;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;

import graphql.GraphQLContext;

import com.cyberclub.learn.dtos.domain.Lesson;
import com.cyberclub.learn.dtos.domain.Option;
import com.cyberclub.learn.dtos.domain.Question;
import com.cyberclub.learn.dtos.domain.QuestionResult;
import com.cyberclub.learn.dtos.domain.Quiz;
import com.cyberclub.learn.dtos.domain.QuizAttempt;
import com.cyberclub.learn.dtos.inputs.AnswerInput;
import com.cyberclub.learn.dtos.inputs.QuizInput;
import com.cyberclub.learn.security.Policies;
import com.cyberclub.learn.services.AuthService;
import com.cyberclub.learn.services.QuizService;

/**
 * Quizzes (L4). {@code Option.correct} and the author-only counters resolve to
 * null unless the top-level resolver marked the caller as an author
 * ({@link Access#DRAFTS}); learners never receive the answer key.
 */
@Controller
public class QuizResolver {

    private final AuthService auth;
    private final QuizService quizzes;

    public QuizResolver(AuthService auth, QuizService quizzes) {
        this.auth = auth;
        this.quizzes = quizzes;
    }

    // ---------------------------------------------------------------- nested fields

    @BatchMapping(typeName = "Lesson", field = "quiz")
    public Map<Lesson, Quiz> quiz(List<Lesson> parents) {
        Map<UUID, Quiz> byLesson = quizzes.forLessons(parents);
        return parents.stream().filter(l -> byLesson.containsKey(l.id()))
            .collect(Collectors.toMap(Function.identity(), l -> byLesson.get(l.id())));
    }

    @BatchMapping(typeName = "Quiz", field = "questions")
    public Map<Quiz, List<Question>> questions(List<Quiz> parents) {
        Map<UUID, List<Question>> byQuiz = quizzes.questionsFor(parents);
        return parents.stream().collect(Collectors.toMap(Function.identity(), q -> byQuiz.getOrDefault(q.id(), List.of())));
    }

    @BatchMapping(typeName = "Question", field = "options")
    public Map<Question, List<Option>> options(List<Question> parents) {
        Map<UUID, List<Option>> byQuestion = quizzes.optionsFor(parents);
        return parents.stream().collect(Collectors.toMap(Function.identity(), q -> byQuestion.getOrDefault(q.id(), List.of())));
    }

    /** The answer key. Null for learners regardless of their attempts. */
    @SchemaMapping(typeName = "Option", field = "correct")
    public Boolean correct(Option o, GraphQLContext ctx) {
        return Access.drafts(ctx) ? o.correct() : null;
    }

    @BatchMapping(typeName = "Quiz", field = "myBestAttempt")
    public Map<Quiz, QuizAttempt> myBestAttempt(List<Quiz> parents) {
        Map<UUID, QuizAttempt> best = quizzes.bestAttemptsFor(parents);
        return parents.stream().filter(q -> best.containsKey(q.id()))
            .collect(Collectors.toMap(Function.identity(), q -> best.get(q.id())));
    }

    @BatchMapping(typeName = "Quiz", field = "myAttemptCount")
    public Map<Quiz, Integer> myAttemptCount(List<Quiz> parents) {
        Map<UUID, Integer> n = quizzes.myAttemptCountsFor(parents);
        return parents.stream().collect(Collectors.toMap(Function.identity(), q -> n.getOrDefault(q.id(), 0)));
    }

    @BatchMapping(typeName = "Quiz", field = "attemptCount")
    public Map<Quiz, Integer> attemptCount(List<Quiz> parents, GraphQLContext ctx) {
        if (!Access.drafts(ctx)) return Map.of();
        Map<UUID, int[]> s = quizzes.statsFor(parents);
        return parents.stream().collect(Collectors.toMap(Function.identity(), q -> s.getOrDefault(q.id(), new int[2])[0]));
    }

    @BatchMapping(typeName = "Quiz", field = "passedCount")
    public Map<Quiz, Integer> passedCount(List<Quiz> parents, GraphQLContext ctx) {
        if (!Access.drafts(ctx)) return Map.of();
        Map<UUID, int[]> s = quizzes.statsFor(parents);
        return parents.stream().collect(Collectors.toMap(Function.identity(), q -> s.getOrDefault(q.id(), new int[2])[1]));
    }

    @SchemaMapping(typeName = "QuizAttempt", field = "results")
    public List<QuestionResult> results(QuizAttempt a) {
        return quizzes.resultsOf(a);
    }

    // ---------------------------------------------------------------- mutations

    @MutationMapping
    public QuizAttempt submitQuiz(@Argument UUID quizId, @Argument List<AnswerInput> answers, @Argument UUID pathId, GraphQLContext ctx) {
        Access.learnerSeesDrafts(auth, ctx);
        return quizzes.submit(quizId, answers, pathId);
    }

    @MutationMapping
    public Quiz upsertQuiz(@Argument QuizInput input, GraphQLContext ctx) {
        auth.require(Policies.CONTENT_AUTHOR);
        ctx.put(Access.DRAFTS, true);
        return quizzes.upsert(input);
    }
}
