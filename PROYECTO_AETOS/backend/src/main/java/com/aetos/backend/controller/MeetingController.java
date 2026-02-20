package com.aetos.backend.controller;

import com.aetos.backend.model.Attendance;
import com.aetos.backend.model.Meeting;
import com.aetos.backend.model.ProgramWeekly;
import com.aetos.backend.model.Role;
import com.aetos.backend.model.User;
import com.aetos.backend.repository.AttendanceRepository;
import com.aetos.backend.repository.MeetingRepository;
import com.aetos.backend.repository.ProgramWeeklyRepository;
import com.aetos.backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class MeetingController {

    private final MeetingRepository meetingRepository;
    private final UserRepository userRepository;
    private final AttendanceRepository attendanceRepository;
    private final ProgramWeeklyRepository programRepository;

    public MeetingController(MeetingRepository meetingRepository, UserRepository userRepository, AttendanceRepository attendanceRepository, ProgramWeeklyRepository programRepository) {
        this.meetingRepository = meetingRepository;
        this.userRepository = userRepository;
        this.attendanceRepository = attendanceRepository;
        this.programRepository = programRepository;
    }

    // Only leader or admin should call this (secured by role in SecurityConfig)
    @PostMapping("/leader/meetings")
    public ResponseEntity<?> createMeeting(Authentication auth, @RequestBody Map<String, Object> body) {
        String email = (String) auth.getPrincipal();
        User creator = userRepository.findByEmail(email).orElse(null);
        if (creator == null || (creator.getRol() != Role.LIDER && creator.getRol() != Role.ADMIN)) {
            return ResponseEntity.status(403).body(Map.of("error", "Only leader or admin can create meetings"));
        }
        
        // Buscar programa activo AHORA (mismo día y horario actual)
        LocalDateTime now = LocalDateTime.now();
        LocalDate today = now.toLocalDate();
        
        var programs = programRepository.findAll();
        ProgramWeekly currentProgram = programs.stream()
                .filter(p -> {
                    // Debe ser del mismo día
                    LocalDate programDate = p.getWeekStart();
                    if (!programDate.equals(today)) {
                        return false;
                    }
                    
                    // Verificar que estemos en el horario del programa
                    try {
                        String[] horaInicio = p.getHora().split(":");
                        String[] horaFin = p.getHoraFin().split(":");
                        
                        int horaActual = now.getHour();
                        int minutoActual = now.getMinute();
                        int horaInicioInt = Integer.parseInt(horaInicio[0]);
                        int minutoInicioInt = Integer.parseInt(horaInicio[1]);
                        int horaFinInt = Integer.parseInt(horaFin[0]);
                        int minutoFinInt = Integer.parseInt(horaFin[1]);

                        int minutosActuales = horaActual * 60 + minutoActual;
                        int minutosInicio = horaInicioInt * 60 + minutoInicioInt;
                        int minutosFin = horaFinInt * 60 + minutoFinInt;

                        return minutosActuales >= minutosInicio && minutosActuales <= minutosFin;
                    } catch (Exception e) {
                        return false;
                    }
                })
                .findFirst()
                .orElse(null);

        if (currentProgram == null) {
            return ResponseEntity.status(400).body(Map.of(
                "error", "No hay programa activo en este momento. Verifique que haya un programa configurado para hoy y que esté dentro del horario programado."
            ));
        }
        
        // Check if there's already an active meeting for today's program
        var existingMeeting = meetingRepository.findAll().stream()
                .filter(Meeting::isActiva)
                .filter(m -> m.getFecha().toLocalDate().equals(today))
                .findFirst();
        
        if (existingMeeting.isPresent()) {
            Meeting m = existingMeeting.get();
            boolean leaderAlready = attendanceRepository.findAll().stream()
                    .anyMatch(a -> a.getMeeting().getId().equals(m.getId()) && a.getUser().getId().equals(creator.getId()));
            if (!leaderAlready) {
                Attendance leaderAttendance = Attendance.builder()
                        .user(creator)
                        .meeting(m)
                        .timestamp(LocalDateTime.now())
                        .build();
                attendanceRepository.save(leaderAttendance);
            }
            System.out.println("Returning existing active meeting. id=" + m.getId() + ", token=" + m.getTokenQr());
            return ResponseEntity.ok(m);
        }
        
        // Create new meeting only if none exists for today
        Meeting m = Meeting.builder()
                .fecha(LocalDateTime.now())
                .tokenQr(UUID.randomUUID().toString())
                .activa(true)
                .build();
        meetingRepository.save(m);
        
        // Automatically register attendance for the leader who created the meeting
        Attendance leaderAttendance = Attendance.builder()
                .user(creator)
                .meeting(m)
                .timestamp(LocalDateTime.now())
                .build();
        attendanceRepository.save(leaderAttendance);
        
        System.out.println("✅ Líder registrado automáticamente: " + creator.getNombre());
        
        return ResponseEntity.ok(m);
    }

    // Regenerate QR for active meeting
    @PostMapping("/leader/meetings/regenerate-qr")
    public ResponseEntity<?> regenerateQr(Authentication auth) {
        String email = (String) auth.getPrincipal();
        User creator = userRepository.findByEmail(email).orElse(null);
        if (creator == null || (creator.getRol() != Role.LIDER && creator.getRol() != Role.ADMIN)) {
            return ResponseEntity.status(403).body(Map.of("error", "Only leader or admin can regenerate QR"));
        }

        var activeMeeting = meetingRepository.findAll().stream()
                .filter(Meeting::isActiva)
                .findFirst();

        if (activeMeeting.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No active meeting"));
        }

        Meeting meeting = activeMeeting.get();
        meeting.setTokenQr(UUID.randomUUID().toString());
        meetingRepository.save(meeting);
        return ResponseEntity.ok(meeting);
    }

    // Get members who missed last 2 meetings (for "Te Extrañamos" alert)
    @GetMapping("/leader/absent-members")
    public ResponseEntity<?> getAbsentMembers(Authentication auth) {
        String email = (String) auth.getPrincipal();
        User creator = userRepository.findByEmail(email).orElse(null);
        if (creator == null || (creator.getRol() != Role.LIDER && creator.getRol() != Role.ADMIN)) {
            return ResponseEntity.status(403).body(Map.of("error", "Only leader or admin can view this"));
        }

        // Get last 2 meetings
        var recentMeetings = meetingRepository.findAll().stream()
                .sorted((a, b) -> b.getFecha().compareTo(a.getFecha()))
                .limit(2)
                .toList();

        if (recentMeetings.size() < 2) {
            return ResponseEntity.ok(java.util.List.of());
        }

        // Get all users who attended these meetings
        var attendedUserIds = attendanceRepository.findAll().stream()
                .filter(a -> recentMeetings.stream().anyMatch(m -> m.getId().equals(a.getMeeting().getId())))
                .map(a -> a.getUser().getId())
                .collect(java.util.stream.Collectors.toSet());

        // Get users who didn't attend (exclude ADMIN users - they don't participate)
        var absentUsers = userRepository.findAll().stream()
                .filter(u -> u.getRol() != Role.ADMIN) // Excluir administradores
                .filter(u -> !attendedUserIds.contains(u.getId()))
                .toList();

        return ResponseEntity.ok(absentUsers);
    }

    // Endpoint to mark attendance by scanning QR: body { tokenQr }
    @PostMapping("/attend")
    public ResponseEntity<?> attend(@RequestBody Map<String, String> body, Authentication auth) {
        System.out.println("=== DEBUG ATTEND ENDPOINT ===");
        String tokenQr = body.get("tokenQr");
        tokenQr = tokenQr != null ? tokenQr.trim() : null;
        System.out.println("Token QR received: '" + tokenQr + "'");
        
        if (tokenQr == null || tokenQr.isEmpty()) {
            System.out.println("ERROR: tokenQr is null/empty");
            return ResponseEntity.badRequest().body(Map.of("error", "tokenQr required"));
        }
        
        var opt = meetingRepository.findByTokenQrAndActivaTrue(tokenQr);
        if (opt.isEmpty()) {
            System.out.println("ERROR: No active meeting with token: " + tokenQr);
            var activeTokens = meetingRepository.findAll().stream()
                    .filter(Meeting::isActiva)
                    .map(Meeting::getTokenQr)
                    .toList();
            System.out.println("Active meetings count: " + activeTokens.size());
            System.out.println("Active tokens: " + activeTokens);
            return ResponseEntity.badRequest().body(Map.of(
                "error", "No active meeting with token",
                "debugActiveTokens", activeTokens.toString()
            ));
        }
        
        Meeting meeting = opt.get();
        System.out.println("Meeting found: " + meeting.getId() + ", active: " + meeting.isActiva());
        
        LocalDateTime now = LocalDateTime.now();
        System.out.println("Current time: " + now);

        // Simplified validation: if meeting is active and token matches, accept attendance
        System.out.println("SUCCESS: Meeting and token validated");
        
        String email = (String) auth.getPrincipal();
        System.out.println("User email from auth: " + email);
        
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            System.out.println("ERROR: User not found for email: " + email);
            return ResponseEntity.status(401).body(Map.of("error", "User not found"));
        }
        
        System.out.println("User found: " + user.getNombre() + " " + user.getApellidos() + " (ID: " + user.getId() + ")");
        
        // Check if user already marked attendance
        boolean alreadyMarked = attendanceRepository.findAll().stream()
                .anyMatch(a -> a.getMeeting().getId().equals(meeting.getId()) && a.getUser().getId().equals(user.getId()));
        
        System.out.println("Already marked attendance: " + alreadyMarked);
        
        if (alreadyMarked) {
            System.out.println("ERROR: Usuario ya marcó asistencia");
            return ResponseEntity.status(400).body(Map.of("error", "Ya has marcado tu asistencia"));
        }
        
        System.out.println("Creating attendance record...");
        Attendance a = Attendance.builder().meeting(meeting).user(user).timestamp(now).build();
        attendanceRepository.save(a);
        
        System.out.println("SUCCESS: Attendance recorded for " + user.getNombre() + " " + user.getApellidos());
        return ResponseEntity.ok(Map.of(
            "message", "attendance recorded",
            "userName", user.getNombre() + " " + user.getApellidos(),
            "timestamp", a.getTimestamp().toString()
        ));
    }

    // Get active meeting (for displaying QR)
    @GetMapping("/leader/active-meeting")
    public ResponseEntity<?> getActiveMeeting(Authentication auth) {
        String email = (String) auth.getPrincipal();
        User creator = userRepository.findByEmail(email).orElse(null);
        if (creator == null || (creator.getRol() != Role.LIDER && creator.getRol() != Role.ADMIN)) {
            return ResponseEntity.status(403).body(Map.of("error", "Only leader or admin can view this"));
        }

        var activeMeeting = meetingRepository.findAll().stream()
                .filter(Meeting::isActiva)
                .findFirst();

        if (activeMeeting.isEmpty()) {
            return ResponseEntity.ok(Map.of());
        }

        return ResponseEntity.ok(activeMeeting.get());
    }

    // Get attendance count for a meeting
    @GetMapping("/leader/meetings/{meetingId}/attendance-count")
    public ResponseEntity<?> getAttendanceCount(@PathVariable Long meetingId, Authentication auth) {
        String email = (String) auth.getPrincipal();
        User creator = userRepository.findByEmail(email).orElse(null);
        if (creator == null || (creator.getRol() != Role.LIDER && creator.getRol() != Role.ADMIN)) {
            return ResponseEntity.status(403).body(Map.of("error", "Only leader or admin can view this"));
        }

        long count = attendanceRepository.findAll().stream()
                .filter(a -> a.getMeeting().getId().equals(meetingId))
                .count();

        return ResponseEntity.ok(count);
    }

    // Get attendances for active meeting (real-time)
    @GetMapping("/leader/meetings/active/attendances")
    public ResponseEntity<?> getActiveMeetingAttendances(Authentication auth) {
        System.out.println("=== DEBUG GET ACTIVE MEETING ATTENDANCES ===");
        
        String email = (String) auth.getPrincipal();
        System.out.println("User email from auth: " + email);
        
        User creator = userRepository.findByEmail(email).orElse(null);
        if (creator == null) {
            System.out.println("ERROR: User not found for email: " + email);
            return ResponseEntity.status(403).body(Map.of("error", "Usuario no encontrado"));
        }
        
        System.out.println("User found: " + creator.getNombre() + " " + creator.getApellidos());
        System.out.println("User role: " + creator.getRol().name());
        
        if (creator.getRol() != Role.LIDER && creator.getRol() != Role.ADMIN) {
            System.out.println("ERROR: User is not LIDER or ADMIN, role is: " + creator.getRol());
            return ResponseEntity.status(403).body(Map.of("error", "Only leader or admin can view this"));
        }
        
        System.out.println("SUCCESS: User has permission (LIDER or ADMIN)");

        var activeMeeting = meetingRepository.findAll().stream()
                .filter(Meeting::isActiva)
                .findFirst();

        if (activeMeeting.isEmpty()) {
            System.out.println("No active meeting found");
            return ResponseEntity.ok(Map.of("attendances", java.util.List.of()));
        }
        
        System.out.println("Active meeting found: " + activeMeeting.get().getId());

        Meeting meeting = activeMeeting.get();
        
        // Check if meeting is expired based on program schedule
        LocalDateTime now = LocalDateTime.now();
        LocalDate today = now.toLocalDate();
        
        var programs = programRepository.findAll();
        var todaysPrograms = programs.stream()
                .filter(p -> p.getWeekStart().equals(today))
                .toList();
        ProgramWeekly currentProgram = todaysPrograms.stream()
                .filter(p -> {
                    try {
                        LocalTime start = LocalTime.parse(p.getHora());
                        LocalTime end = LocalTime.parse(p.getHoraFin());
                        LocalTime current = now.toLocalTime();
                        return !current.isBefore(start) && !current.isAfter(end);
                    } catch (Exception e) {
                        return false;
                    }
                })
                .findFirst()
                .orElse(null);
        
        // Get attendances regardless of expiration status
        var attendances = attendanceRepository.findAll().stream()
                .filter(a -> a.getMeeting() != null && a.getMeeting().getId() != null && a.getMeeting().getId().equals(meeting.getId()))
                .map(a -> {
                    User user = a.getUser();
                    return Map.of(
                        "id", a.getId(),
                        "userId", user.getId(),
                        "userName", (user.getNombre() != null ? user.getNombre() : "") + " " + (user.getApellidos() != null ? user.getApellidos() : ""),
                        "timestamp", a.getTimestamp().toString()
                    );
                })
                .toList();
        
        System.out.println("📋 Total asistencias encontradas: " + attendances.size());
        
        // Check if meeting is expired (but still return attendances)
        boolean isExpired = false;
        try {
            LocalTime currentTime = now.toLocalTime();
            LocalTime latestEnd = todaysPrograms.stream()
                    .map(p -> {
                        try { return LocalTime.parse(p.getHoraFin()); } catch (Exception e) { return null; }
                    })
                    .filter(t -> t != null)
                    .max(LocalTime::compareTo)
                    .orElse(null);
            if (latestEnd != null) {
                System.out.println("⏰ Verificando expiración (última hora fin de hoy): " + latestEnd + ", ahora: " + currentTime);
                if (currentTime.isAfter(latestEnd)) {
                    meeting.setActiva(false);
                    meetingRepository.save(meeting);
                    isExpired = true;
                }
            } else {
                System.out.println("⚠️ No hay programas para hoy");
            }
        } catch (Exception e) {
            System.out.println("❌ Error verificando expiración: " + e.getMessage());
        }

        // Calculate expiration time using the last end time of today's programs
        String expiresAt = meeting.getFecha().plusMinutes(120).toString(); // Default fallback
        try {
            LocalTime latestEnd = todaysPrograms.stream()
                    .map(p -> {
                        try { return LocalTime.parse(p.getHoraFin()); } catch (Exception e) { return null; }
                    })
                    .filter(t -> t != null)
                    .max(LocalTime::compareTo)
                    .orElse(null);
            if (latestEnd != null) {
                LocalDate meetingDate = meeting.getFecha().toLocalDate();
                expiresAt = LocalDateTime.of(meetingDate, latestEnd).toString();
            }
        } catch (Exception e) {
            // keep default
        }
        
        return ResponseEntity.ok(Map.of(
            "attendances", attendances, 
            "meeting", meeting,
            "expiresAt", expiresAt,
            "expired", isExpired
        ));
    }

    // Get all users with attendance status for active meeting
    @GetMapping("/leader/meetings/active/users-status")
    public ResponseEntity<?> getUsersAttendanceStatus(Authentication auth) {
        String email = (String) auth.getPrincipal();
        User creator = userRepository.findByEmail(email).orElse(null);
        if (creator == null || (creator.getRol() != Role.LIDER && creator.getRol() != Role.ADMIN)) {
            return ResponseEntity.status(403).body(Map.of("error", "Only leader or admin can view this"));
        }

        var activeMeeting = meetingRepository.findAll().stream()
                .filter(Meeting::isActiva)
                .findFirst();

        if (activeMeeting.isEmpty()) {
            return ResponseEntity.ok(Map.of("users", java.util.List.of(), "meeting", null));
        }

        Meeting meeting = activeMeeting.get();
        
        // Check expiration using the last end time of today's programs
        LocalDate today = LocalDate.now();
        var todays = programRepository.findAll().stream()
                .filter(p -> p.getWeekStart().equals(today))
                .toList();
        try {
            LocalTime nowTime = LocalDateTime.now().toLocalTime();
            LocalTime latestEnd = todays.stream()
                    .map(p -> { try { return LocalTime.parse(p.getHoraFin()); } catch (Exception e) { return null; } })
                    .filter(t -> t != null)
                    .max(LocalTime::compareTo)
                    .orElse(null);
            if (latestEnd != null && nowTime.isAfter(latestEnd)) {
                meeting.setActiva(false);
                meetingRepository.save(meeting);
                return ResponseEntity.ok(Map.of("expired", true, "users", java.util.List.of(), "meeting", meeting));
            }
        } catch (Exception e) {
            System.out.println("❌ Error verificando horario: " + e.getMessage());
        }

        // Get all attendances for this meeting
        var attendanceMap = attendanceRepository.findAll().stream()
                .filter(a -> a.getMeeting().getId().equals(meeting.getId()))
                .collect(Collectors.toMap(
                    a -> a.getUser().getId(),
                    a -> a.getTimestamp().toString()
                ));

        // Get all users with their attendance status (exclude ADMIN users)
        var allUsers = userRepository.findAll().stream()
                .filter(user -> user.getRol() != Role.ADMIN) // Excluir administradores
                .map(user -> {
                    boolean hasAttended = attendanceMap.containsKey(user.getId());
                    return Map.of(
                        "id", user.getId(),
                        "nombre", user.getNombre(),
                        "apellidos", user.getApellidos(),
                        "fullName", user.getNombre() + " " + user.getApellidos(),
                        "email", user.getEmail(),
                        "rol", user.getRol().toString(),
                        "hasAttended", hasAttended,
                        "timestamp", hasAttended ? attendanceMap.get(user.getId()) : ""
                    );
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
            "users", allUsers,
            "meeting", Map.of(
                "id", meeting.getId(),
                "fecha", meeting.getFecha().toString(),
                "activa", meeting.isActiva()
            ),
            "expiresAt", meeting.getFecha().plusMinutes(5).toString()
        ));
    }

    // Get attendance history for a specific meeting
    @GetMapping("/leader/meetings/{meetingId}/history")
    public ResponseEntity<?> getMeetingAttendanceHistory(@PathVariable Long meetingId, Authentication auth) {
        String email = (String) auth.getPrincipal();
        User creator = userRepository.findByEmail(email).orElse(null);
        if (creator == null || (creator.getRol() != Role.LIDER && creator.getRol() != Role.ADMIN)) {
            return ResponseEntity.status(403).body(Map.of("error", "Only leader or admin can view this"));
        }

        var meeting = meetingRepository.findById(meetingId);
        if (meeting.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Meeting not found"));
        }

        var attendances = attendanceRepository.findAll().stream()
                .filter(a -> a.getMeeting().getId().equals(meetingId))
                .map(a -> Map.of(
                    "id", a.getId(),
                    "userId", a.getUser().getId(),
                    "userName", a.getUser().getNombre() + " " + a.getUser().getApellidos(),
                    "userEmail", a.getUser().getEmail(),
                    "timestamp", a.getTimestamp().toString()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
            "meeting", Map.of(
                "id", meeting.get().getId(),
                "fecha", meeting.get().getFecha().toString(),
                "activa", meeting.get().isActiva()
            ),
            "attendances", attendances,
            "totalAttendances", attendances.size()
        ));
    }

    // Get all meetings history
    @GetMapping("/leader/meetings/history")
    public ResponseEntity<?> getAllMeetingsHistory(Authentication auth) {
        String email = (String) auth.getPrincipal();
        User creator = userRepository.findByEmail(email).orElse(null);
        if (creator == null || (creator.getRol() != Role.LIDER && creator.getRol() != Role.ADMIN)) {
            return ResponseEntity.status(403).body(Map.of("error", "Only leader or admin can view this"));
        }

        var meetings = meetingRepository.findAll().stream()
                .sorted((m1, m2) -> m2.getFecha().compareTo(m1.getFecha())) // Most recent first
                .map(meeting -> {
                    long attendanceCount = attendanceRepository.findAll().stream()
                            .filter(a -> a.getMeeting().getId().equals(meeting.getId()))
                            .count();
                    
                    return Map.of(
                        "id", meeting.getId(),
                        "fecha", meeting.getFecha().toString(),
                        "activa", meeting.isActiva(),
                        "attendanceCount", attendanceCount
                    );
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of("meetings", meetings));
    }

    // Get user's personal attendance history
    @GetMapping("/user/my-attendances")
    public ResponseEntity<?> getMyAttendances(Authentication auth) {
        String email = (String) auth.getPrincipal();
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "User not found"));
        }

        // Get all meetings
        var allMeetings = meetingRepository.findAll().stream()
                .sorted((m1, m2) -> m2.getFecha().compareTo(m1.getFecha())) // Most recent first
                .map(meeting -> {
                    // Check if user attended this meeting
                    var attendance = attendanceRepository.findAll().stream()
                            .filter(a -> a.getMeeting().getId().equals(meeting.getId()) && 
                                        a.getUser().getId().equals(user.getId()))
                            .findFirst()
                            .orElse(null);
                    
                    boolean attended = attendance != null;
                    
                    return Map.of(
                        "id", meeting.getId(),
                        "fecha", meeting.getFecha().toString(),
                        "activa", meeting.isActiva(),
                        "attended", attended,
                        "timestamp", attended ? attendance.getTimestamp().toString() : ""
                    );
                })
                .collect(Collectors.toList());

        long totalMeetings = allMeetings.size();
        long attendedCount = allMeetings.stream().filter(m -> (Boolean) m.get("attended")).count();
        long missedCount = totalMeetings - attendedCount;

        return ResponseEntity.ok(Map.of(
            "meetings", allMeetings,
            "stats", Map.of(
                "total", totalMeetings,
                "attended", attendedCount,
                "missed", missedCount
            )
        ));
    }

    // Check if there's an active meeting and if user has attended
    @GetMapping("/user/active-meeting-status")
    public ResponseEntity<?> getActiveMeetingStatus(Authentication auth) {
        String email = (String) auth.getPrincipal();
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "User not found"));
        }

        var activeMeeting = meetingRepository.findAll().stream()
                .filter(Meeting::isActiva)
                .findFirst();

        if (activeMeeting.isEmpty()) {
            return ResponseEntity.ok(Map.of("hasActiveMeeting", false));
        }

        Meeting meeting = activeMeeting.get();
        
        // Check expiration against today's programs (use last end time)
        LocalDate today = LocalDate.now();
        var todays = programRepository.findAll().stream()
                .filter(p -> p.getWeekStart().equals(today))
                .toList();
        LocalTime nowTime = LocalDateTime.now().toLocalTime();
        LocalTime latestEnd = todays.stream().map(p -> {
            try { return LocalTime.parse(p.getHoraFin()); } catch (Exception e) { return null; }
        }).filter(t -> t != null).max(LocalTime::compareTo).orElse(null);
        if (latestEnd != null && nowTime.isAfter(latestEnd)) {
            meeting.setActiva(false);
            meetingRepository.save(meeting);
            return ResponseEntity.ok(Map.of("hasActiveMeeting", false, "expired", true));
        }

        // Check if user already attended
        boolean hasAttended = attendanceRepository.findAll().stream()
                .anyMatch(a -> a.getMeeting().getId().equals(meeting.getId()) && 
                              a.getUser().getId().equals(user.getId()));

        String expiresAt = meeting.getFecha().plusMinutes(120).toString();
        if (latestEnd != null) {
            expiresAt = LocalDateTime.of(meeting.getFecha().toLocalDate(), latestEnd).toString();
        }

        return ResponseEntity.ok(Map.of(
            "hasActiveMeeting", true,
            "hasAttended", hasAttended,
            "meetingId", meeting.getId(),
            "meetingDate", meeting.getFecha().toString(),
            "expiresAt", expiresAt,
            "tokenQr", meeting.getTokenQr()
        ));
    }

    // Get comprehensive attendance report for all users
    @GetMapping("/leader/attendance-report")
    public ResponseEntity<?> getAttendanceReport(Authentication auth) {
        String email = (String) auth.getPrincipal();
        User creator = userRepository.findByEmail(email).orElse(null);
        if (creator == null || (creator.getRol() != Role.LIDER && creator.getRol() != Role.ADMIN)) {
            return ResponseEntity.status(403).body(Map.of("error", "Only leader or admin can view this"));
        }

        // Get all meetings sorted by date (most recent first)
        var allMeetings = meetingRepository.findAll().stream()
                .sorted((m1, m2) -> m2.getFecha().compareTo(m1.getFecha()))
                .toList();

        // Get last 2 meetings for consecutive absence detection
        var lastTwoMeetings = allMeetings.stream().limit(2).toList();

        // Get all attendances
        var allAttendances = attendanceRepository.findAll();

        // Build report for each user
        var userReports = userRepository.findAll().stream()
                .map(user -> {
                    // Count total attendances for this user
                    long attendedCount = allAttendances.stream()
                            .filter(a -> a.getUser().getId().equals(user.getId()))
                            .count();
                    
                    long totalMeetings = allMeetings.size();
                    long missedCount = totalMeetings - attendedCount;
                    
                    // Check if user missed last 2 meetings consecutively
                    boolean missedLastTwo = false;
                    if (lastTwoMeetings.size() >= 2) {
                        boolean missedFirst = allAttendances.stream()
                                .noneMatch(a -> a.getUser().getId().equals(user.getId()) && 
                                              a.getMeeting().getId().equals(lastTwoMeetings.get(0).getId()));
                        boolean missedSecond = allAttendances.stream()
                                .noneMatch(a -> a.getUser().getId().equals(user.getId()) && 
                                              a.getMeeting().getId().equals(lastTwoMeetings.get(1).getId()));
                        missedLastTwo = missedFirst && missedSecond;
                    }
                    
                    // Get attendance history (last 10 meetings)
                    var recentHistory = allMeetings.stream()
                            .limit(10)
                            .map(meeting -> {
                                boolean attended = allAttendances.stream()
                                        .anyMatch(a -> a.getUser().getId().equals(user.getId()) && 
                                                     a.getMeeting().getId().equals(meeting.getId()));
                                return Map.of(
                                    "meetingId", meeting.getId(),
                                    "fecha", meeting.getFecha().toString(),
                                    "attended", attended
                                );
                            })
                            .toList();
                    
                    // Use HashMap to avoid Map.of() size limitation
                    java.util.Map<String, Object> userMap = new java.util.HashMap<>();
                    userMap.put("userId", user.getId());
                    userMap.put("nombre", user.getNombre());
                    userMap.put("apellidos", user.getApellidos());
                    userMap.put("fullName", user.getNombre() + " " + user.getApellidos());
                    userMap.put("email", user.getEmail());
                    userMap.put("telefono", user.getCelular() != null ? user.getCelular() : "");
                    userMap.put("rol", user.getRol().toString());
                    userMap.put("totalMeetings", totalMeetings);
                    userMap.put("attended", attendedCount);
                    userMap.put("missed", missedCount);
                    userMap.put("attendanceRate", totalMeetings > 0 ? (attendedCount * 100 / totalMeetings) : 0);
                    userMap.put("missedLastTwo", missedLastTwo);
                    userMap.put("needsAlert", missedLastTwo);
                    userMap.put("recentHistory", recentHistory);
                    
                    return userMap;
                })
                .toList();

        return ResponseEntity.ok(Map.of(
            "users", userReports,
            "totalUsers", userReports.size(),
            "totalMeetings", allMeetings.size()
        ));
    }
}