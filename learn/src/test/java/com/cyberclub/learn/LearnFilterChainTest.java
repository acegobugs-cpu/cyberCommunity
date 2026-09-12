package com.cyberclub.learn;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Filter-chain behaviour that happens BEFORE GraphQL execution, so it is
 * asserted at the HTTP level: gateway trust and the user-id requirement.
 */
class LearnFilterChainTest extends BaseIntegrationTest {

    private static final String BODY = "{\"query\":\"{ courses { id } }\"}";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void missing_internal_secret_is_401() throws Exception {
        mockMvc.perform(post("/graphql")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-User-Id", USER_ID)
                        .content(BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("unauthorized"));
    }

    @Test
    void missing_user_id_is_401() throws Exception {
        mockMvc.perform(post("/graphql")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Internal-Auth", SECRET)
                        .content(BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.message").value("userId header missing"));
    }

    @Test
    void malformed_user_id_is_401() throws Exception {
        mockMvc.perform(post("/graphql")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Internal-Auth", SECRET)
                        .header("X-User-Id", "not-a-uuid")
                        .content(BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("UNAUTHORIZED"));
    }

    @Test
    void trusted_request_reaches_graphql() throws Exception {
        mockMvc.perform(post("/graphql")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Internal-Auth", SECRET)
                        .header("X-User-Id", USER_ID)
                        .content(BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.courses").isArray());
    }
}
