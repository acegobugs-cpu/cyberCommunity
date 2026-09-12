package com.cyberclub.learn.config;

import javax.sql.DataSource;

import org.flywaydb.core.Flyway;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

/**
 * Applies the real Flyway migrations from infra/migrations/learn to the
 * Testcontainers database. Runtime migrations stay external (Plan 00 AD-6).
 */
@TestConfiguration
public class TestFlywayConfig {

    @Bean(initMethod = "migrate")
    public Flyway testFlyway(DataSource dataSource) {
        return Flyway.configure()
                .dataSource(dataSource)
                .schemas("learn")
                .createSchemas(true)
                .locations("filesystem:../infra/migrations/learn")
                .load();
    }
}
