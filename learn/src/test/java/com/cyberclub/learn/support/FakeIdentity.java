package com.cyberclub.learn.support;

import java.io.IOException;
import java.util.concurrent.atomic.AtomicReference;

import okhttp3.mockwebserver.Dispatcher;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;

/**
 * Stand-in for the identity service's
 * {@code GET /private/api/member/check?userId&serviceName=learn}.
 *
 * One GraphQL request can trigger several membership checks (each resolver
 * calls {@code auth.require}), so a dispatcher that answers every call the same
 * way is more robust than enqueueing responses one by one.
 */
public final class FakeIdentity {

    private final MockWebServer server = new MockWebServer();
    private final AtomicReference<MockResponse> current = new AtomicReference<>(member("USER"));
    private volatile RecordedRequest lastRequest;

    public void start() throws IOException {
        server.setDispatcher(new Dispatcher() {
            @Override
            public MockResponse dispatch(RecordedRequest request) {
                lastRequest = request;
                return current.get();
            }
        });
        server.start();
    }

    public void stop() throws IOException {
        server.shutdown();
    }

    public String baseUrl() {
        String url = server.url("/").toString();
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    /** Identity answers 200 {allowed:true, role}. */
    public void grant(String role) {
        current.set(member(role));
    }

    /** Identity answers 403 {allowed:false} — user has no membership in learn. */
    public void deny() {
        current.set(new MockResponse()
                .setResponseCode(403)
                .setHeader("Content-Type", "application/json")
                .setBody("{\"allowed\":false,\"role\":null}"));
    }

    /** Identity is down. */
    public void fail(int status) {
        current.set(new MockResponse().setResponseCode(status));
    }

    public RecordedRequest lastRequest() {
        return lastRequest;
    }

    private static MockResponse member(String role) {
        return new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody("{\"allowed\":true,\"role\":\"" + role + "\"}");
    }
}
