package com.cyberclub.identity.api.internalcontrollers;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cyberclub.identity.api.dtos.MemberRecord;
import com.cyberclub.identity.repository.UserRepo;

/** Internal member directory used by the domain services (requires X-Internal-Auth). */
@RestController
@RequestMapping("/private/api")
public class InternalUserController {

    private final UserRepo users;

    public InternalUserController(UserRepo users) {
        this.users = users;
    }

    @GetMapping("/{serviceName}/members")
    public List<MemberRecord> members(@PathVariable String serviceName) {
        return users.findMembers(serviceName);
    }

    /** 404 when the user is not a member of the service. */
    @GetMapping("/{serviceName}/members/{userId}")
    public ResponseEntity<MemberRecord> member(@PathVariable String serviceName, @PathVariable UUID userId) {
        return users.findMember(serviceName, userId)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
