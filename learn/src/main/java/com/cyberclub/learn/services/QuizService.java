package com.cyberclub.learn.services;

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cyberclub.learn.context.UserContext;
import com.cyberclub.learn.dtos.domain.Lesson;
import com.cyberclub.learn.dtos.domain.LessonType;
import com.cyberclub.learn.dtos.domain.Option;
import com.cyberclub.learn.dtos.domain.Question;
import com.cyberclub.learn.dtos.domain.QuestionKind;
import com.cyberclub.learn.dtos.domain.QuestionResult;
import com.cyberclub.learn.dtos.domain.Quiz;
import com.cyberclub.learn.dtos.domain.QuizAttempt;
import com.cyberclub.learn.dtos.inputs.AnswerInput;
import com.cyberclub.learn.dtos.inputs.OptionInput;
import com.cyberclub.learn.dtos.inputs.QuestionInput;
import com.cyberclub.learn.dtos.inputs.QuizInput;
import com.cyberclub.learn.exceptions.BadRequestException;
import com.cyberclub.learn.exceptions.NotFoundException;
import com.cyberclub.learn.repositories.LessonRepo;
import com.cyberclub.learn.repositories.QuizRepo;
import com.cyberclub.learn.repositories.QuizRepo.OptionRow;
import com.cyberclub.learn.repositories.QuizRepo.QuestionRow;

/**
 * Quizzes (L4). Grading: each question is worth {@code points}; SINGLE is
 * right when the one chosen option is the correct one, MULTI when the chosen
 * set equals the correct set (no partial credit). score = round(earned /
 * total * 100); passed = score >= passScore → lesson completed.
 */
@Service
public class QuizService {

    private final QuizRepo quizzes;
    private final LessonRepo lessons;
    private final ProgressService progress;

    public QuizService(QuizRepo quizzes, LessonRepo lessons, ProgressService progress) {
        this.quizzes = quizzes;
        this.lessons = lessons;
        this.progress = progress;
    }

    // ---------------------------------------------------------------- reads

    public Map<UUID, Quiz> forLessons(List<Lesson> ls) {
        return quizzes.findByLessonIds(ls.stream().map(Lesson::id).toList());
    }

    public Map<UUID, List<Question>> questionsFor(List<Quiz> qs) {
        return quizzes.questionsFor(qs.stream().map(Quiz::id).toList());
    }

    public Map<UUID, List<Option>> optionsFor(List<Question> qs) {
        return quizzes.optionsFor(qs.stream().map(Question::id).toList());
    }

    public Map<UUID, QuizAttempt> bestAttemptsFor(List<Quiz> qs) {
        return quizzes.bestAttempts(UserContext.getUserId(), qs.stream().map(Quiz::id).toList());
    }

    public Map<UUID, Integer> myAttemptCountsFor(List<Quiz> qs) {
        return quizzes.myAttemptCounts(UserContext.getUserId(), qs.stream().map(Quiz::id).toList());
    }

    public Map<UUID, int[]> statsFor(List<Quiz> qs) {
        return quizzes.attemptStats(qs.stream().map(Quiz::id).toList());
    }

    /** Re-derive per-question outcomes of an attempt against the quiz as it is now. */
    public List<QuestionResult> resultsOf(QuizAttempt a) {
        return grade(quizzes.questions(a.quizId()), quizzes.optionsForQuiz(a.quizId()), a.answers()).results();
    }

    // ---------------------------------------------------------------- learner

    @Transactional
    public QuizAttempt submit(UUID quizId, List<AnswerInput> answers, UUID pathId) {
        Quiz quiz = quizzes.findById(quizId).orElseThrow(() -> new NotFoundException("quiz not found"));
        Lesson lesson = lessons.findById(quiz.lessonId()).orElseThrow(() -> new NotFoundException("lesson not found"));
        progress.requireReachable(lesson.moduleId(), pathId);   // published somewhere / in pathId

        List<Question> questions = quizzes.questions(quizId);
        if (questions.isEmpty()) throw new BadRequestException("quiz has no questions");
        Map<UUID, List<Option>> options = quizzes.optionsForQuiz(quizId);

        Map<UUID, List<UUID>> chosen = new LinkedHashMap<>();
        Set<UUID> known = questions.stream().map(Question::id).collect(Collectors.toSet());
        for (AnswerInput a : answers == null ? List.<AnswerInput>of() : answers) {
            if (!known.contains(a.questionId())) throw new BadRequestException("question not in this quiz: " + a.questionId());
            if (chosen.containsKey(a.questionId())) throw new BadRequestException("question answered twice: " + a.questionId());
            Set<UUID> valid = options.getOrDefault(a.questionId(), List.of()).stream().map(Option::id).collect(Collectors.toSet());
            List<UUID> ids = a.optionIds() == null ? List.of() : a.optionIds().stream().distinct().toList();
            for (UUID id : ids) {
                if (!valid.contains(id)) throw new BadRequestException("option " + id + " does not belong to question " + a.questionId());
            }
            chosen.put(a.questionId(), ids);
        }

        Graded g = grade(questions, options, chosen);
        boolean passed = g.score() >= quiz.passScore();
        QuizAttempt attempt = quizzes.insertAttempt(quizId, UserContext.getUserId(), chosen, g.score(), passed);
        if (passed) progress.recordCompletion(lesson, pathId);   // idempotent; a second pass changes nothing
        return attempt;
    }

    // ---------------------------------------------------------------- grading (pure)

    record Graded(int score, List<QuestionResult> results) {}

    static Graded grade(List<Question> questions, Map<UUID, List<Option>> options, Map<UUID, List<UUID>> answers) {
        int total = 0, earned = 0;
        List<QuestionResult> results = new java.util.ArrayList<>();
        for (Question q : questions) {
            Set<UUID> correct = options.getOrDefault(q.id(), List.of()).stream()
                .filter(Option::correct).map(Option::id).collect(Collectors.toSet());
            Set<UUID> given = new HashSet<>(answers.getOrDefault(q.id(), List.of()));
            boolean right = switch (q.kind()) {
                case SINGLE -> given.size() == 1 && correct.containsAll(given);
                case MULTI -> !given.isEmpty() && given.equals(correct);
            };
            total += q.points();
            int pts = right ? q.points() : 0;
            earned += pts;
            results.add(new QuestionResult(q.id(), right, pts, q.points()));
        }
        int score = total == 0 ? 0 : (int) Math.round(earned * 100.0 / total);
        return new Graded(score, results);
    }

    // ---------------------------------------------------------------- author

    @Transactional
    public Quiz upsert(QuizInput in) {
        Lesson lesson = lessons.findById(in.lessonId()).orElseThrow(() -> new NotFoundException("lesson not found"));
        if (lesson.type() != LessonType.QUIZ) throw new BadRequestException("only QUIZ lessons can carry a quiz");
        int pass = in.passScore() == null ? 70 : in.passScore();
        if (pass < 0 || pass > 100) throw new BadRequestException("passScore must be 0..100");
        if (in.questions() == null || in.questions().isEmpty()) throw new BadRequestException("a quiz needs at least one question");

        List<QuestionRow> rows = new java.util.ArrayList<>();
        int n = 0;
        for (QuestionInput q : in.questions()) {
            n++;
            String prompt = PathService.required(q.promptMd(), "question " + n + " prompt");
            QuestionKind kind = q.kind() == null ? QuestionKind.SINGLE : q.kind();
            int points = q.points() == null ? 1 : q.points();
            if (points < 1) throw new BadRequestException("question " + n + ": points must be >= 1");
            List<OptionInput> opts = q.options() == null ? List.of() : q.options();
            if (opts.size() < 2) throw new BadRequestException("question " + n + " needs at least two options");
            long correct = opts.stream().filter(o -> Boolean.TRUE.equals(o.correct())).count();
            if (kind == QuestionKind.SINGLE && correct != 1) throw new BadRequestException("question " + n + ": SINGLE needs exactly one correct option");
            if (kind == QuestionKind.MULTI && correct < 1) throw new BadRequestException("question " + n + ": MULTI needs at least one correct option");
            List<OptionRow> optionRows = new java.util.ArrayList<>();
            int m = 0;
            for (OptionInput o : opts) {
                m++;
                optionRows.add(new OptionRow(PathService.required(o.textMd(), "question " + n + " option " + m), Boolean.TRUE.equals(o.correct())));
            }
            rows.add(new QuestionRow(prompt, kind, points, optionRows));
        }

        Quiz quiz = quizzes.upsertQuiz(lesson.id(), pass, in.shuffle() == null || in.shuffle());
        quizzes.replaceQuestions(quiz.id(), rows);
        return quiz;
    }

    /** Publish guard: every QUIZ lesson in the path must have a quiz. */
    public List<UUID> quizLessonsWithoutQuiz(UUID pathId) {
        return quizzes.quizLessonsWithoutQuiz(pathId);
    }
}
