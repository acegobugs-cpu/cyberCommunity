package com.cyberclub.gateway.restcontroller;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;

import com.cyberclub.gateway.Forward;

@RestController
public class ProxyController {

    private final Logger log = LoggerFactory.getLogger(ProxyController.class);
    @Value("${gateway.localMode:true}") // default true for local
    private boolean localMode;
    private final Forward forwardingService;
    private static final Map<String, String> LOCAL_SERVICE_PORTS = Map.of(
        "identity", "8082",
        "portal", "9000",
        "learn", "9002",
        "challenge", "9006",
        "community", "9004"
    );

    private static final Set<String> SERVICES = Set.of("identity", "portal", "learn", "challenge", "community");

    public ProxyController(Forward forwardingService) {
        this.forwardingService = forwardingService;
    }

    @RequestMapping("/**")
    public ResponseEntity<byte[]> proxy(HttpServletRequest request) throws IOException {
        boolean authenticated = Boolean.TRUE.equals(request.getAttribute("authenticated"));
        String service = (String) request.getAttribute("serviceName");

        if(!authenticated){
            service = "identity";
        } 
        if (!SERVICES.contains(service)) {
            throw new IllegalArgumentException("unidentified service");
        } 

        String downstreamUrl;
        if (localMode) {
            String port = LOCAL_SERVICE_PORTS.get(service);
            downstreamUrl = "http://localhost:" + port;
        } else {
            // Docker / production mode
            downstreamUrl = "http://" + service + ":8080";
        }

        log.info("auth={}, service={}, url={}", authenticated, service, downstreamUrl);

        return forwardingService.forward(request, downstreamUrl);
    }


}
