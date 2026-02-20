package com.aetos.backend.controller;

import com.aetos.backend.model.*;
import com.aetos.backend.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class ExtendedFeaturesController {

    private final NotificationRepository notificationRepository;
    private final AbsenceJustificationRepository justificationRepository;
    private final UserRepository userRepository;
    private final AttendanceRepository attendanceRepository;
    private final MeetingRepository meetingRepository;

    public ExtendedFeaturesController(
            NotificationRepository notificationRepository,
            AbsenceJustificationRepository justificationRepository,
            UserRepository userRepository,
            AttendanceRepository attendanceRepository,
            MeetingRepository meetingRepository) {
        this.notificationRepository = notificationRepository;
        this.justificationRepository = justificationRepository;
        this.userRepository = userRepository;
        this.attendanceRepository = attendanceRepository;
        this.meetingRepository = meetingRepository;
    }

    // ============== NOTIFICACIONES ==============

    @PostMapping("/leader/notifications")
    public ResponseEntity<?> createNotification(@RequestBody Map<String, String> body, Authentication auth) {
        String email = (String) auth.getPrincipal();
        User sender = userRepository.findByEmail(email).orElse(null);
        
        if (sender == null || (sender.getRol() != Role.LIDER && sender.getRol() != Role.ADMIN)) {
            return ResponseEntity.status(403).body(Map.of("error", "Only leader or admin can send notifications"));
        }

        Notification notification = Notification.builder()
                .title(body.get("title"))
                .message(body.get("message"))
                .sender(sender)
                .isActive(true)
                .build();

        notificationRepository.save(notification);
        return ResponseEntity.ok(notification);
    }

    @GetMapping("/notifications/active")
    public ResponseEntity<?> getActiveNotifications() {
        List<Notification> notifications = notificationRepository.findByIsActiveTrueOrderByCreatedAtDesc();
        
        List<Map<String, Object>> result = notifications.stream().map(n -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", n.getId());
            map.put("title", n.getTitle());
            map.put("message", n.getMessage());
            map.put("senderName", n.getSender().getNombre() + " " + n.getSender().getApellidos());
            map.put("createdAt", n.getCreatedAt().toString());
            return map;
        }).collect(Collectors.toList());
        
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/leader/notifications/{id}")
    public ResponseEntity<?> deleteNotification(@PathVariable Long id, Authentication auth) {
        String email = (String) auth.getPrincipal();
        User user = userRepository.findByEmail(email).orElse(null);
        
        if (user == null || (user.getRol() != Role.LIDER && user.getRol() != Role.ADMIN)) {
            return ResponseEntity.status(403).body(Map.of("error", "Unauthorized"));
        }

        Notification notification = notificationRepository.findById(id).orElse(null);
        if (notification == null) {
            return ResponseEntity.notFound().build();
        }

        notification.setIsActive(false);
        notificationRepository.save(notification);
        return ResponseEntity.ok(Map.of("message", "Notification deleted"));
    }

    // ============== JUSTIFICACIONES DE AUSENCIA ==============

    @PostMapping("/user/justifications")
    public ResponseEntity<?> submitJustification(@RequestBody Map<String, Object> body, Authentication auth) {
        String email = (String) auth.getPrincipal();
        User user = userRepository.findByEmail(email).orElse(null);
        
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "User not found"));
        }

        Long meetingId = Long.valueOf(body.get("meetingId").toString());
        Meeting meeting = meetingRepository.findById(meetingId).orElse(null);
        
        if (meeting == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Meeting not found"));
        }

        AbsenceJustification justification = AbsenceJustification.builder()
                .user(user)
                .meeting(meeting)
                .reason(body.get("reason").toString())
                .status("PENDING")
                .build();

        justificationRepository.save(justification);
        return ResponseEntity.ok(justification);
    }

    @GetMapping("/user/my-justifications")
    public ResponseEntity<?> getMyJustifications(Authentication auth) {
        String email = (String) auth.getPrincipal();
        User user = userRepository.findByEmail(email).orElse(null);
        
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "User not found"));
        }

        List<AbsenceJustification> justifications = justificationRepository.findByUser_IdOrderBySubmittedAtDesc(user.getId());
        
        List<Map<String, Object>> result = justifications.stream().map(j -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", j.getId());
            map.put("meetingDate", j.getMeeting().getFecha().toString());
            map.put("reason", j.getReason());
            map.put("status", j.getStatus());
            map.put("submittedAt", j.getSubmittedAt().toString());
            if (j.getReviewedBy() != null) {
                map.put("reviewedBy", j.getReviewedBy().getNombre() + " " + j.getReviewedBy().getApellidos());
                map.put("reviewComment", j.getReviewComment());
            }
            return map;
        }).collect(Collectors.toList());
        
        return ResponseEntity.ok(result);
    }

    @GetMapping("/leader/justifications/pending")
    public ResponseEntity<?> getPendingJustifications(Authentication auth) {
        String email = (String) auth.getPrincipal();
        User user = userRepository.findByEmail(email).orElse(null);
        
        if (user == null || (user.getRol() != Role.LIDER && user.getRol() != Role.ADMIN)) {
            return ResponseEntity.status(403).body(Map.of("error", "Unauthorized"));
        }

        List<AbsenceJustification> justifications = justificationRepository.findByStatusOrderBySubmittedAtDesc("PENDING");
        
        List<Map<String, Object>> result = justifications.stream().map(j -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", j.getId());
            map.put("userName", j.getUser().getNombre() + " " + j.getUser().getApellidos());
            map.put("userId", j.getUser().getId());
            map.put("meetingId", j.getMeeting().getId());
            map.put("meetingDate", j.getMeeting().getFecha().toString());
            map.put("reason", j.getReason());
            map.put("submittedAt", j.getSubmittedAt().toString());
            return map;
        }).collect(Collectors.toList());
        
        return ResponseEntity.ok(result);
    }

    @PutMapping("/leader/justifications/{id}/review")
    public ResponseEntity<?> reviewJustification(@PathVariable Long id, @RequestBody Map<String, String> body, Authentication auth) {
        String email = (String) auth.getPrincipal();
        User reviewer = userRepository.findByEmail(email).orElse(null);
        
        if (reviewer == null || (reviewer.getRol() != Role.LIDER && reviewer.getRol() != Role.ADMIN)) {
            return ResponseEntity.status(403).body(Map.of("error", "Unauthorized"));
        }

        AbsenceJustification justification = justificationRepository.findById(id).orElse(null);
        if (justification == null) {
            return ResponseEntity.notFound().build();
        }

        justification.setStatus(body.get("status")); // APPROVED or REJECTED
        justification.setReviewedBy(reviewer);
        justification.setReviewedAt(LocalDateTime.now());
        justification.setReviewComment(body.get("comment"));
        
        justificationRepository.save(justification);
        return ResponseEntity.ok(justification);
    }

    // ============== MARCAR ASISTENCIA MANUAL ==============

    @PostMapping("/leader/manual-attendance")
    public ResponseEntity<?> markManualAttendance(@RequestBody Map<String, Object> body, Authentication auth) {
        String email = (String) auth.getPrincipal();
        User marker = userRepository.findByEmail(email).orElse(null);
        
        if (marker == null || (marker.getRol() != Role.LIDER && marker.getRol() != Role.ADMIN)) {
            return ResponseEntity.status(403).body(Map.of("error", "Only leader or admin can mark manual attendance"));
        }

        Long userId = Long.valueOf(body.get("userId").toString());
        Long meetingId = Long.valueOf(body.get("meetingId").toString());
        String justification = body.get("justification") != null ? body.get("justification").toString() : "";

        User user = userRepository.findById(userId).orElse(null);
        Meeting meeting = meetingRepository.findById(meetingId).orElse(null);

        if (user == null || meeting == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "User or meeting not found"));
        }

        // Check if already marked
        boolean alreadyMarked = attendanceRepository.findAll().stream()
                .anyMatch(a -> a.getMeeting().getId().equals(meetingId) && a.getUser().getId().equals(userId));

        if (alreadyMarked) {
            return ResponseEntity.badRequest().body(Map.of("error", "Attendance already marked for this user"));
        }

        Attendance attendance = Attendance.builder()
                .user(user)
                .meeting(meeting)
                .timestamp(LocalDateTime.now())
                .markedBy(marker)
                .markedManually(true)
                .justification(justification)
                .build();

        attendanceRepository.save(attendance);
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Attendance marked manually");
        response.put("userName", user.getNombre() + " " + user.getApellidos());
        response.put("markedBy", marker.getNombre() + " " + marker.getApellidos());
        
        return ResponseEntity.ok(response);
    }

    // ============== RANKING DE ASISTENCIA ==============

    @GetMapping("/ranking")
    public ResponseEntity<?> getAttendanceRanking() {
        List<User> allUsers = userRepository.findAll().stream()
                .filter(u -> u.getRol() == Role.MIEMBRO)
                .collect(Collectors.toList());

        List<Meeting> allMeetings = meetingRepository.findAll();
        int totalMeetings = allMeetings.size();

        List<Map<String, Object>> ranking = allUsers.stream().map(user -> {
            long attendedCount = attendanceRepository.findAll().stream()
                    .filter(a -> a.getUser().getId().equals(user.getId()))
                    .count();

            int percentage = totalMeetings > 0 ? (int) ((attendedCount * 100) / totalMeetings) : 0;

            Map<String, Object> map = new HashMap<>();
            map.put("userName", user.getNombre() + " " + user.getApellidos());
            map.put("attended", attendedCount);
            map.put("total", totalMeetings);
            map.put("percentage", percentage);
            return map;
        })
        .sorted((a, b) -> Integer.compare((int) b.get("percentage"), (int) a.get("percentage")))
        .collect(Collectors.toList());

        return ResponseEntity.ok(ranking);
    }
}
