package com.cyberclub.learn;

import java.io.IOException;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.boot.test.autoconfigure.graphql.tester.AutoConfigureHttpGraphQlTester;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

import com.cyberclub.learn.config.TestFlywayConfig;
import com.cyberclub.learn.support.FakeIdentity;

/**
 * Shared fixture: real PostgreSQL (Testcontainers) migrated with the learn
 * Flyway scripts, a MockWebServer standing in for identity, and the trusted
 * headers the gateway would add. Both servers are started once per JVM.
 */
@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureHttpGraphQlTester
@Import(TestFlywayConfig.class)
public abstract class BaseIntegrationTest {

    public static final String SECRET = "test-internal-secret";
    public static final String USER_ID = "11111111-1111-1111-1111-111111111111";

    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");
    protected static final FakeIdentity identity = new FakeIdentity();

    static {
        postgres.start();
        try {
            identity.start();
        } catch (IOException e) {
            throw new IllegalStateException("could not start fake identity", e);
        }
    }

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("identity.base-url", identity::baseUrl);
        registry.add("INTERNAL_GATEWAY_SECRET", () -> SECRET);
    }

    @BeforeEach
    void resetIdentity() {
        identity.grant("USER");
    }
}
