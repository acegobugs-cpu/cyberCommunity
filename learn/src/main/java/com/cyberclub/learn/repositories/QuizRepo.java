package com.cyberclub.learn.repositories;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.cyberclub.learn.dtos.domain.Option;
import com.cyberclub.learn.dtos.domain.Question;
import com.cyberclub.learn.dtos.domain.QuestionKind;
import com.cyberclub.learn.dtos.domain.Quiz;
import com.cyberclub.learn.dtos.domain.QuizAttempt;

@Repository
public class QuizRepo {

    private static final String QUIZ_COLS = "id, lesson_id, pass_score, shuffle, created_at, updated_at";
    private static final String QUESTION_COLS = "id, quiz_id, position, prompt_md, kind, points";
    private static final String OPTION_COLS = "id, question_id, position, text_md, correct";
    private static final String ATTEMPT_COLS = "id, quiz_id, user_id, answers, score, passed, submitted_at";
    private static final TypeReference<Map<UUID, List<UUID>>> ANSWERS = new TypeReference<>() {};

    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public QuizRepo(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    static final RowMapper<Quiz> QUIZ = (rs, i) -> new Quiz(
        rs.getObject("id", UUID.class),
        rs.getObject("lesson_id", UUID.class),
        rs.getInt("pass_score"),
        rs.getBoolean("shuffle"),
        rs.getTimestamp("created_at").toInstant(),
        rs.getTimestamp("updated_at").toInstant()
    );

    static final RowMapper<Question> QUESTION = (rs, i) -> new Question(
        rs.getObject("id", UUID.class),
        rs.getObject("quiz_id", UUID.class),
        rs.getInt("position"),
        rs.getString("prompt_md"),
        QuestionKind.valueOf(rs.getString("kind")),
        rs.getInt("points")
    );

    static final RowMapper<Option> OPTION = (rs, i) -> new Option(
        rs.getObject("id", UUID.class),
        rs.getObject("question_id", UUID.class),
        rs.getInt("position"),
        rs.getString("text_md"),
        rs.getBoolean("correct")
    );

    private final RowMapper<QuizAttempt> attempt = (rs, i) -> {
        Timestamp at = rs.getTimestamp("submitted_at");
        return new QuizAttempt(
            rs.getObject("id", UUID.class),
            rs.getObject("quiz_id", UUID.class),
            rs.getObject("user_id", UUID.class),
            readAnswers(rs.getString("answers")),
            rs.getInt("score"),
            rs.getBoolean("passed"),
            at.toInstant()
        );
    };

    // ---------------------------------------------------------------- quiz

    public Optional<Quiz> findById(UUID id) {
        return jdbc.query("SELECT " + QUIZ_COLS + " FROM quizzes WHERE id = ?", QUIZ, id).stream().findFirst();
    }

    public Optional<Quiz> findByLessonId(UUID lessonId) {
        return jdbc.query("SELECT " + QUIZ_COLS + " FROM quizzes WHERE lesson_id = ?", QUIZ, lessonId).stream().findFirst();
    }

    /** lessonId → quiz for a batch of lessons ({@code Lesson.quiz}). */
    public Map<UUID, Quiz> findByLessonIds(List<UUID> lessonIds) {
        if (lessonIds.isEmpty()) return Map.of();
        Map<UUID, Quiz> out = new LinkedHashMap<>();
        jdbc.query("SELECT " + QUIZ_COLS + " FROM quizzes WHERE lesson_id = ANY(?)",
            rs -> { Quiz q = QUIZ.mapRow(rs, 0); out.put(q.lessonId(), q); },
            (Object) lessonIds.toArray(new UUID[0]));
        return out;
    }

    /** QUIZ lessons of a path that have no quiz yet (publish guard). */
    public List<UUID> quizLessonsWithoutQuiz(UUID pathId) {
        return jdbc.queryForList("""
            SELECT l.id FROM path_modules pm
            JOIN lessons l ON l.module_id = pm.module_id
            LEFT JOIN quizzes q ON q.lesson_id = l.id
            WHERE pm.path_id = ? AND l.type = 'QUIZ' AND q.id IS NULL
            """, UUID.class, pathId);
    }

    public Quiz upsertQuiz(UUID lessonId, int passScore, boolean shuffle) {
        return jdbc.queryForObject("""
            INSERT INTO quizzes (lesson_id, pass_score, shuffle)
            VALUES (?, ?, ?)
            ON CONFLICT (lesson_id) DO UPDATE SET pass_score = EXCLUDED.pass_score, shuffle = EXCLUDED.shuffle, updated_at = now()
            RETURNING %s
            """.formatted(QUIZ_COLS), QUIZ, lessonId, passScore, shuffle);
    }

    // ---------------------------------------------------------------- questions & options

    public List<Question> questions(UUID quizId) {
        return jdbc.query("SELECT " + QUESTION_COLS + " FROM quiz_questions WHERE quiz_id = ? ORDER BY position", QUESTION, quizId);
    }

    /** quizId → questions in order (every requested id present). */
    public Map<UUID, List<Question>> questionsFor(List<UUID> quizIds) {
        Map<UUID, List<Question>> out = new LinkedHashMap<>();
        quizIds.forEach(id -> out.put(id, new ArrayList<>()));
        if (quizIds.isEmpty()) return out;
        jdbc.query("SELECT " + QUESTION_COLS + " FROM quiz_questions WHERE quiz_id = ANY(?) ORDER BY quiz_id, position",
            rs -> { Question q = QUESTION.mapRow(rs, 0); out.get(q.quizId()).add(q); },
            (Object) quizIds.toArray(new UUID[0]));
        return out;
    }

    /** All options of a quiz, grouped by question in order. */
    public Map<UUID, List<Option>> optionsForQuiz(UUID quizId) {
        Map<UUID, List<Option>> out = new LinkedHashMap<>();
        jdbc.query("""
            SELECT %s FROM quiz_options
            WHERE question_id IN (SELECT id FROM quiz_questions WHERE quiz_id = ?)
            ORDER BY question_id, position
            """.formatted(OPTION_COLS),
            rs -> { Option o = OPTION.mapRow(rs, 0); out.computeIfAbsent(o.questionId(), k -> new ArrayList<>()).add(o); },
            quizId);
        return out;
    }

    /** questionId → options in order (every requested id present). */
    public Map<UUID, List<Option>> optionsFor(List<UUID> questionIds) {
        Map<UUID, List<Option>> out = new LinkedHashMap<>();
        questionIds.forEach(id -> out.put(id, new ArrayList<>()));
        if (questionIds.isEmpty()) return out;
        jdbc.query("SELECT " + OPTION_COLS + " FROM quiz_options WHERE question_id = ANY(?) ORDER BY question_id, position",
            rs -> { Option o = OPTION.mapRow(rs, 0); out.get(o.questionId()).add(o); },
            (Object) questionIds.toArray(new UUID[0]));
        return out;
    }

    /** Replace the whole question/option set. Existing attempts keep their (now historical) answer ids. */
    public void replaceQuestions(UUID quizId, List<QuestionRow> rows) {
        jdbc.update("DELETE FROM quiz_questions WHERE quiz_id = ?", quizId);
        int position = 0;
        for (QuestionRow q : rows) {
            UUID questionId = jdbc.queryForObject("""
                INSERT INTO quiz_questions (quiz_id, position, prompt_md, kind, points)
                VALUES (?, ?, ?, ?, ?) RETURNING id
                """, UUID.class, quizId, ++position, q.promptMd(), q.kind().name(), q.points());
            List<OptionRow> opts = q.options();
            jdbc.batchUpdate("INSERT INTO quiz_options (question_id, position, text_md, correct) VALUES (?, ?, ?, ?)",
                opts, opts.size(), (ps, o) -> {
                    ps.setObject(1, questionId);
                    ps.setInt(2, opts.indexOf(o) + 1);
                    ps.setString(3, o.textMd());
                    ps.setBoolean(4, o.correct());
                });
        }
    }

    public record QuestionRow(String promptMd, QuestionKind kind, int points, List<OptionRow> options) {}
    public record OptionRow(String textMd, boolean correct) {}

    // ---------------------------------------------------------------- attempts (append-only)

    public QuizAttempt insertAttempt(UUID quizId, UUID userId, Map<UUID, List<UUID>> answers, int score, boolean passed) {
        return jdbc.queryForObject("""
            INSERT INTO quiz_attempts (quiz_id, user_id, answers, score, passed)
            VALUES (?, ?, ?::jsonb, ?, ?)
            RETURNING %s
            """.formatted(ATTEMPT_COLS), attempt, quizId, userId, jsonb(answers), score, passed);
    }

    public Optional<QuizAttempt> findAttempt(UUID id) {
        return jdbc.query("SELECT " + ATTEMPT_COLS + " FROM quiz_attempts WHERE id = ?", attempt, id).stream().findFirst();
    }

    /** quizId → the user's best attempt (highest score, then latest). */
    public Map<UUID, QuizAttempt> bestAttempts(UUID userId, List<UUID> quizIds) {
        if (quizIds.isEmpty()) return Map.of();
        Map<UUID, QuizAttempt> out = new LinkedHashMap<>();
        jdbc.query("""
            SELECT DISTINCT ON (quiz_id) %s FROM quiz_attempts
            WHERE user_id = ? AND quiz_id = ANY(?)
            ORDER BY quiz_id, score DESC, submitted_at DESC
            """.formatted(ATTEMPT_COLS),
            rs -> { QuizAttempt a = attempt.mapRow(rs, 0); out.put(a.quizId(), a); },
            userId, (Object) quizIds.toArray(new UUID[0]));
        return out;
    }

    /** quizId → number of the user's attempts. */
    public Map<UUID, Integer> myAttemptCounts(UUID userId, List<UUID> quizIds) {
        if (quizIds.isEmpty()) return Map.of();
        Map<UUID, Integer> out = new LinkedHashMap<>();
        jdbc.query("SELECT quiz_id, COUNT(*) AS n FROM quiz_attempts WHERE user_id = ? AND quiz_id = ANY(?) GROUP BY quiz_id",
            rs -> { out.put(rs.getObject("quiz_id", UUID.class), rs.getInt("n")); },
            userId, (Object) quizIds.toArray(new UUID[0]));
        return out;
    }

    /** quizId → [attempts by everyone, distinct learners who passed] (authors). */
    public Map<UUID, int[]> attemptStats(List<UUID> quizIds) {
        if (quizIds.isEmpty()) return Map.of();
        Map<UUID, int[]> out = new LinkedHashMap<>();
        jdbc.query("""
            SELECT quiz_id, COUNT(*) AS attempts, COUNT(DISTINCT user_id) FILTER (WHERE passed) AS passed
            FROM quiz_attempts WHERE quiz_id = ANY(?) GROUP BY quiz_id
            """,
            rs -> { out.put(rs.getObject("quiz_id", UUID.class), new int[] { rs.getInt("attempts"), rs.getInt("passed") }); },
            (Object) quizIds.toArray(new UUID[0]));
        return out;
    }

    // ---------------------------------------------------------------- json

    private String jsonb(Map<UUID, List<UUID>> answers) {
        try {
            return json.writeValueAsString(answers);
        } catch (Exception e) {
            throw new IllegalStateException("cannot serialise answers", e);
        }
    }

    private Map<UUID, List<UUID>> readAnswers(String raw) {
        try {
            return raw == null ? Map.of() : json.readValue(raw, ANSWERS);
        } catch (Exception e) {
            throw new IllegalStateException("corrupt answers json", e);
        }
    }
}
