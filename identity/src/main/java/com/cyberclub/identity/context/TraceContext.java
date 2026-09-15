package com.cyberclub.identity.context;

public class TraceContext {
    private static final ThreadLocal<String> CORRELATION_ID = new ThreadLocal<>();

    private TraceContext(){}

    public static String getCorrelationId(){
        return CORRELATION_ID.get();
    }

    public static void setCorrelationId(String id){
        CORRELATION_ID.set(id);
    }

    public static void clear(){
        CORRELATION_ID.remove();
    }
}
