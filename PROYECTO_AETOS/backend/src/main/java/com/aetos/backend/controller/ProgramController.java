package com.aetos.backend.controller;

import com.aetos.backend.model.Location;
import com.aetos.backend.model.ProgramWeekly;
import com.aetos.backend.model.Role;
import com.aetos.backend.model.User;
import com.aetos.backend.repository.LocationRepository;
import com.aetos.backend.repository.ProgramWeeklyRepository;
import com.aetos.backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ProgramController {

    private final ProgramWeeklyRepository programRepository;
    private final UserRepository userRepository;
    private final LocationRepository locationRepository;

    public ProgramController(ProgramWeeklyRepository programRepository, UserRepository userRepository, LocationRepository locationRepository) {
        this.programRepository = programRepository;
        this.userRepository = userRepository;
        this.locationRepository = locationRepository;
    }

    // Get program for current week (any authenticated user can view)
    @GetMapping("/program")
    public ResponseEntity<?> getCurrentProgram() {
        LocalDate today = LocalDate.now();
        
        // Buscar el programa de la semana actual (hoy debe estar entre weekStart y weekStart+6)
        List<ProgramWeekly> allPrograms = programRepository.findAll();
        if (allPrograms.isEmpty()) {
            return ResponseEntity.ok(Map.of("message", "No program for this week"));
        }
        
        // Buscar programa que incluya HOY
        ProgramWeekly currentWeekProgram = allPrograms.stream()
                .filter(p -> {
                    LocalDate weekStart = p.getWeekStart();
                    LocalDate weekEnd = weekStart.plusDays(6);
                    return !today.isBefore(weekStart) && !today.isAfter(weekEnd);
                })
                .findFirst()
                .orElse(null);
        
        // Si no hay programa para esta semana, devolver el más reciente futuro
        if (currentWeekProgram == null) {
            currentWeekProgram = allPrograms.stream()
                    .filter(p -> !p.getWeekStart().isBefore(today))
                    .min((p1, p2) -> p1.getWeekStart().compareTo(p2.getWeekStart()))
                    .orElse(null);
        }
        
        return currentWeekProgram != null ? ResponseEntity.ok(currentWeekProgram) : 
            ResponseEntity.ok(Map.of("message", "No program for this week"));
    }

    // Get all users (for program assignment) - Exclude ADMIN users
    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(Authentication auth) {
        List<User> users = userRepository.findAll();
        // Filtrar solo usuarios que no sean ADMIN (estos no participan en programas)
        var userList = users.stream()
                .filter(u -> u.getRol() != Role.ADMIN) // Excluir administradores
                .map(u -> Map.of(
                    "id", u.getId(),
                    "nombre", u.getNombre() + " " + u.getApellidos(),
                    "usuario", u.getUsuario(),
                    "email", u.getEmail(),
                    "rol", u.getRol().name()
                ))
                .toList();
        return ResponseEntity.ok(userList);
    }

    // Only leader or admin can create/update program
    @PostMapping("/leader/program")
    public ResponseEntity<?> updateProgram(@RequestBody Map<String, Object> programData, Authentication auth) {
        String email = (String) auth.getPrincipal();
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || (user.getRol() != Role.LIDER && user.getRol() != Role.ADMIN)) {
            return ResponseEntity.status(403).body(Map.of("error", "Only leader or admin can update program"));
        }

        // Parse data
        LocalDate weekStart = LocalDate.parse((String) programData.get("weekStart"));
        String hora = (String) programData.get("hora");
        String horaFin = (String) programData.getOrDefault("horaFin", "22:00");
        Long locationId = programData.get("locationId") != null ? 
            Long.parseLong(programData.get("locationId").toString()) : null;

        // Validate no conflicts (same date and overlapping time)
        List<ProgramWeekly> existingPrograms = programRepository.findAll();
        for (ProgramWeekly existing : existingPrograms) {
            if (existing.getWeekStart().equals(weekStart)) {
                // Check if it's an update of the same program
                Long programId = programData.get("id") != null ? 
                    Long.parseLong(programData.get("id").toString()) : null;
                if (programId == null || !existing.getId().equals(programId)) {
                    // Check time overlap
                    if (timesOverlap(hora, horaFin, existing.getHora(), existing.getHoraFin())) {
                        return ResponseEntity.status(400)
                            .body(Map.of("error", "Ya existe un programa en esta fecha y horario"));
                    }
                }
            }
        }

        ProgramWeekly program;
        Long programId = programData.get("id") != null ? 
            Long.parseLong(programData.get("id").toString()) : null;
        
        if (programId != null) {
            // Update existing
            program = programRepository.findById(programId).orElse(new ProgramWeekly());
        } else {
            program = new ProgramWeekly();
        }

        program.setWeekStart(weekStart);
        program.setHora(hora);
        program.setHoraFin(horaFin);
        
        if (locationId != null) {
            Location location = locationRepository.findById(locationId).orElse(null);
            program.setLocation(location);
        }
        
        program.setResponsableConfraternizacion((String) programData.get("responsableConfraternizacion"));
        program.setResponsableDinamica((String) programData.get("responsableDinamica"));
        program.setResponsableEspecial((String) programData.get("responsableEspecial"));
        program.setResponsableOracionIntercesora((String) programData.get("responsableOracionIntercesora"));
        program.setResponsableTema((String) programData.get("responsableTema"));
        
        programRepository.save(program);
        return ResponseEntity.ok(program);
    }

    // Get all programs (history)
    @GetMapping("/programs")
    public ResponseEntity<?> getAllPrograms() {
        List<ProgramWeekly> programs = programRepository.findAll();
        programs.sort((p1, p2) -> p2.getWeekStart().compareTo(p1.getWeekStart())); // Most recent first
        return ResponseEntity.ok(programs);
    }

    // Delete program (only future programs, only leader or admin)
    @DeleteMapping("/leader/program/{id}")
    public ResponseEntity<?> deleteProgram(@PathVariable Long id, Authentication auth) {
        String email = (String) auth.getPrincipal();
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || (user.getRol() != Role.LIDER && user.getRol() != Role.ADMIN)) {
            return ResponseEntity.status(403).body(Map.of("error", "Only leader or admin can delete programs"));
        }

        ProgramWeekly program = programRepository.findById(id).orElse(null);
        if (program == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Program not found"));
        }

        // Only allow deleting future programs
        if (program.getWeekStart().isBefore(LocalDate.now())) {
            return ResponseEntity.status(400)
                .body(Map.of("error", "No se pueden eliminar programas pasados"));
        }

        programRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Program deleted"));
    }

    // Helper method to check time overlap
    private boolean timesOverlap(String start1, String end1, String start2, String end2) {
        if (start1 == null || end1 == null || start2 == null || end2 == null) {
            return false;
        }
        
        LocalTime s1 = LocalTime.parse(start1);
        LocalTime e1 = LocalTime.parse(end1);
        LocalTime s2 = LocalTime.parse(start2);
        LocalTime e2 = LocalTime.parse(end2);
        
        return (s1.isBefore(e2) && e1.isAfter(s2));
    }
}
