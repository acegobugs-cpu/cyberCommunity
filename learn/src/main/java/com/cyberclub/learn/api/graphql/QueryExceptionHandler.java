package com.cyberclub.learn.api.graphql;

import graphql.GraphQLError;
import graphql.GraphqlErrorBuilder;
import com.cyberclub.learn.context.TraceContext;
import com.cyberclub.learn.exceptions.BadRequestException;
import com.cyberclub.learn.exceptions.ForbiddenException;
import com.cyberclub.learn.exceptions.NotFoundException;
import com.cyberclub.learn.exceptions.UnauthorizedException;
import graphql.schema.DataFetchingEnvironment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.graphql.execution.DataFetcherExceptionResolverAdapter;
import org.springframework.graphql.execution.ErrorType;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

/**
 * Maps domain exceptions thrown inside data fetchers to GraphQL error
 * classifications. Mirrors RestExceptionHandler; `extensions.correlationId`
 * carries the request id set by CorrelationFilter (X-Request-Id).
 */
@Component
public class QueryExceptionHandler extends DataFetcherExceptionResolverAdapter {

    private static final Logger log = LoggerFactory.getLogger(QueryExceptionHandler.class);

    @Override
    protected GraphQLError resolveToSingleError(Throwable ex, DataFetchingEnvironment env) {
        String correlationId = TraceContext.getCorrelationId();
        if (correlationId == null) {
            correlationId = UUID.randomUUID().toString();
        }

        if (ex instanceof UnauthorizedException) {
            return buildError(ErrorType.UNAUTHORIZED, ex.getMessage(), env, correlationId);
        }
        if (ex instanceof ForbiddenException) {
            return buildError(ErrorType.FORBIDDEN, ex.getMessage(), env, correlationId);
        }
        if (ex instanceof NotFoundException) {
            return buildError(ErrorType.NOT_FOUND, ex.getMessage(), env, correlationId);
        }
        if (ex instanceof BadRequestException || ex instanceof IllegalArgumentException) {
            return buildError(ErrorType.BAD_REQUEST, ex.getMessage(), env, correlationId);
        }

        log.error("[{}] Unhandled exception in {}: {}", correlationId, env.getField().getName(), ex.toString());
        return buildError(ErrorType.INTERNAL_ERROR, "internal server error", env, correlationId);
    }

    private GraphQLError buildError(ErrorType errorType, String message, DataFetchingEnvironment env, String correlationId) {
        return GraphqlErrorBuilder.newError(env)
                .errorType(errorType)
                .message(message)
                .extensions(Map.of("correlationId", correlationId))
                .build();
    }
}