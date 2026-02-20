package com.aetos.backend.controller;

import com.aetos.backend.model.PrayerRequest;
import com.aetos.backend.model.Meeting;
import com.aetos.backend.model.Role;
import com.aetos.backend.model.User;
import com.aetos.backend.repository.PrayerRequestRepository;
import com.aetos.backend.repository.MeetingRepository;
import com.aetos.backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class PrayerController {

    private final PrayerRequestRepository prayerRequestRepository;
    private final MeetingRepository meetingRepository;
    private final UserRepository userRepository;

    public PrayerController(PrayerRequestRepository prayerRequestRepository, 
                           MeetingRepository meetingRepository,
                           UserRepository userRepository) {
        this.prayerRequestRepository = prayerRequestRepository;
        this.meetingRepository = meetingRepository;
        this.userRepository = userRepository;
    }

    // Get prayer requests for active meeting (any authenticated user)
    @GetMapping("/prayers")
    public ResponseEntity<?> getPrayersForActiveMeeting() {
        var activeMeeting = meetingRepository.findAll().stream()
                .filter(Meeting::isActiva)
                .findFirst();
        
        if (activeMeeting.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }
        
        List<PrayerRequest> prayers = prayerRequestRepository.findByMeetingId(activeMeeting.get().getId());
        return ResponseEntity.ok(prayers);
    }

    // Leader or admin adds prayer request
    @PostMapping("/leader/prayers")
    public ResponseEntity<?> addPrayerRequest(@RequestBody Map<String, Object> body, Authentication auth) {
        String email = (String) auth.getPrincipal();
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || (user.getRol() != Role.LIDER && user.getRol() != Role.ADMIN)) {
            return ResponseEntity.status(403).body(Map.of("error", "Only leader or admin can add prayers"));
        }

        var activeMeeting = meetingRepository.findAll().stream()
                .filter(Meeting::isActiva)
                .findFirst();
        
        if (activeMeeting.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No active meeting"));
        }

        String requestText = (String) body.get("requestText");
        String requesterName = (String) body.get("requesterName");
        Boolean isVisitor = (Boolean) body.get("isVisitor");

        PrayerRequest prayer = PrayerRequest.builder()
                .requestText(requestText)
                .requesterName(requesterName)
                .isVisitor(isVisitor != null ? isVisitor : false)
                .meeting(activeMeeting.get())
                .createdAt(LocalDateTime.now())
                .build();

        prayerRequestRepository.save(prayer);
        return ResponseEntity.ok(prayer);
    }

    // Leader or admin deletes prayer request
    @DeleteMapping("/leader/prayers/{id}")
    public ResponseEntity<?> deletePrayerRequest(@PathVariable Long id, Authentication auth) {
        String email = (String) auth.getPrincipal();
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || (user.getRol() != Role.LIDER && user.getRol() != Role.ADMIN)) {
            return ResponseEntity.status(403).body(Map.of("error", "Only leader or admin can delete prayers"));
        }

        prayerRequestRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Prayer deleted"));
    }
}
