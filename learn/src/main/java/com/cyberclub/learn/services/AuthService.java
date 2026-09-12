package com.cyberclub.learn.services;


import org.springframework.stereotype.Service;

import com.cyberclub.learn.security.AuthPolicy;
import com.cyberclub.learn.security.ClientAuth;
import com.cyberclub.learn.context.*;
import com.cyberclub.learn.dtos.AuthResult;

@Service
public class AuthService {
    
    private final ClientAuth clientAuth;

    public AuthService(ClientAuth clientAuth){
        this.clientAuth = clientAuth;
    }

    public AuthResult require(AuthPolicy policy){
        AuthResult user = clientAuth.checkMembership(UserContext.getUserId());
        policy.check(user);
        return user;
    }

}
