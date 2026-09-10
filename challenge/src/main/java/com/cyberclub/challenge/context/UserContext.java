package com.cyberclub.challenge.context;

import java.util.UUID;

public final class UserContext {  
    
    private static final ThreadLocal<UUID> CURRENT_USER_ID = new ThreadLocal<>();

    private UserContext(){};

    public static void setId(UUID userId) {
        CURRENT_USER_ID.set(userId);
    }

    // public static void setRole(String role){
    //     CURRENT_USER_ID.set(role);
    // }

    public static UUID getId(){
        UUID userId = CURRENT_USER_ID.get();
        if(userId == null){
            throw new IllegalStateException("no user in context");
        }

        return userId;
    }

    public static boolean isSet(){
        return CURRENT_USER_ID.get() != null;
    }

    public static void clear(){
        CURRENT_USER_ID.remove();
    }


}
