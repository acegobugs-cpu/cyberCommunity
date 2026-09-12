package com.cyberclub.learn.api.graphql;

import graphql.GraphQLError;
import graphql.GraphqlErrorBuilder;
import com.cyberclub.learn.exceptions.ForbiddenException;
import com.cyberclub.learn.exceptions.NotFoundException;
import graphql.schema.DataFetchingEnvironment;
import org.springframework.graphql.execution.DataFetcherExceptionResolverAdapter;
import org.springframework.graphql.execution.ErrorType;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

@Component
public class QueryExceptionHandler extends DataFetcherExceptionResolverAdapter {

    @Override
    protected GraphQLError resolveToSingleError(Throwable ex, DataFetchingEnvironment env) {
        String correlationId = UUID.randomUUID().toString();

        // Handle specific domain exceptions
        if (ex instanceof ForbiddenException) {
            return buildError(ErrorType.FORBIDDEN, ex.getMessage(), env, correlationId);
        }

        if (ex instanceof IllegalArgumentException || ex instanceof NotFoundException) {
            return buildError(ErrorType.NOT_FOUND, ex.getMessage(), env, correlationId);
        }

        // Catch-all for unhandled internal exceptions
        return buildError(ErrorType.INTERNAL_ERROR, "An internal server error occurred.", env, correlationId);
    }

    private GraphQLError buildError(ErrorType errorType, String message, DataFetchingEnvironment env, String correlationId) {
        return GraphqlErrorBuilder.newError(env)
                .errorType(errorType)
                .message(message)
                .extensions(Map.of("correlationId", correlationId))
                .build();
    }
}