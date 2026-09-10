package com.cyberclub.learn.context;

import java.util.UUID;
public class UserContext {
    private static final ThreadLocal<UUID> CURRENT_USER_ID = new ThreadLocal<>();

    private UserContext(){}

    public static void setUserId(UUID userId){
        CURRENT_USER_ID.set(userId);
    }

    public static UUID getUserId(){
        UUID userId = CURRENT_USER_ID.get();
        if(userId == null){
            throw new IllegalStateException("No User in context");
        }
        return userId;
    }

    public static boolean isSetUserId(){
        return CURRENT_USER_ID.get() != null;
    }

    public static void clear(){
        CURRENT_USER_ID.remove();
    }
    
}
