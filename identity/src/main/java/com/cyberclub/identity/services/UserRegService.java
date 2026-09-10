package com.cyberclub.identity.services;

import java.time.Instant;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

import com.cyberclub.identity.api.dtos.User;
import com.cyberclub.identity.exceptions.UnauthorizedException;
import com.cyberclub.identity.exceptions.ConflictException;
import com.cyberclub.identity.repository.UserRepo;

@Service
public class UserRegService{

    private final UserRepo userRepo;
    private final PasswordEncoder encoder;

    public UserRegService(UserRepo userRepo, PasswordEncoder encoder){
        this.userRepo = userRepo;
        this.encoder = encoder;
    }

    @Transactional
    public User register(String username, String email, String password){
        if(userRepo.existsByEmail(email)){
            throw new ConflictException("email already in use");
        }
        String HashedPassword = encoder.encode(password);

        User user = new User(
            UUID.randomUUID(),
            username,
            email,
            HashedPassword,
            Instant.now()
        );

        try{
            userRepo.save(user);
            return user;
        } catch (DataIntegrityViolationException ex){
            throw new ConflictException("email already in use");
        }
    }

    public User authenticate(String email, String password) {
        return userRepo.findByEmail(email)
            .filter(user ->
                encoder.matches(password, user.password())
            )
            .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));
    }
}