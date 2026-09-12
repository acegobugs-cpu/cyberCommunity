package com.cyberclub.portal.api.rest;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;

import com.cyberclub.portal.services.InfoService;

import java.util.Map;

@RestController
public class HomeController {

    private final InfoService info;

    public HomeController(InfoService info){
        this.info = info;
    }
    
    @GetMapping("/portal/info")
    public Map<String, String> home() {
        return info.getInfo();
    }
    
}
