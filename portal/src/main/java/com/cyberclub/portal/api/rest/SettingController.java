package com.cyberclub.portal.api.rest;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.http.ResponseEntity;
import jakarta.validation.Valid;

import com.cyberclub.portal.services.SettingService;
import com.cyberclub.portal.dtos.SettingData;

@RestController
public class SettingController{
    private final SettingService setting;

    public SettingController(SettingService setting){
        this.setting = setting;
    }

    @PostMapping("/setting")
    public ResponseEntity<Void> postSetting(@Valid @RequestBody SettingData req ){
        setting.setSetting(req);
        return ResponseEntity.ok().build();
    }
}