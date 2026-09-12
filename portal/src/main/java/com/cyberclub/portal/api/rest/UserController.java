package com.cyberclub.portal.api.rest;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cyberclub.portal.services.UserService;
import com.cyberclub.portal.dtos.Member;

import java.util.List;

@RestController
public class UserController{
    private final UserService userService;

    public UserController(UserService userService){
        this.userService = userService;
    }

    @GetMapping("/users")
    public List<Member> allUsers(){
        return userService.members();
    }

}