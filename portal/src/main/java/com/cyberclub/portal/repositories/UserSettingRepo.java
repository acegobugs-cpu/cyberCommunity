package com.cyberclub.portal.repositories;

import org.springframework.stereotype.Repository;

import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;

@Repository
public class UserSettingRepo{
    private final JdbcTemplate jdbcTemplate;

    public UserSettingRepo(JdbcTemplate jdbcTemplate){
        this.jdbcTemplate = jdbcTemplate;
    }

    public void setSetting(UUID userId, String theme, boolean notifications, String language){
        var sql = """
                INSERT INTO user_setting (user_id, theme, notifications_enabled, language_code) 
                VALUES (?, ?, ?, ?)
                ON CONFLICT (user_id)
                DO UPDATE SET
                    theme = EXCLUDED.theme,
                    notifications_enabled = EXCLUDED.notifications_enabled,
                    language_code = EXCLUDED.language_code,
                    updated_at = NOW()
                """;

        jdbcTemplate.update(sql, userId, theme, notifications, language);
    }
}