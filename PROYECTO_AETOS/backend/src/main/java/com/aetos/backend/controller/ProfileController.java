package com.aetos.backend.controller;

import com.aetos.backend.model.ProgramWeekly;
import com.aetos.backend.model.Role;
import com.aetos.backend.model.User;
import com.aetos.backend.repository.ProgramWeeklyRepository;
import com.aetos.backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ProgramWeeklyRepository programWeeklyRepository;

    public ProfileController(UserRepository userRepository, PasswordEncoder passwordEncoder, ProgramWeeklyRepository programWeeklyRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.programWeeklyRepository = programWeeklyRepository;
    }

    @GetMapping
    public ResponseEntity<?> getUserProfile(Authentication auth) {
        String email = (String) auth.getPrincipal();
        User user = userRepository.findByEmail(email).orElse(null);
        
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Usuario no encontrado"));
        }
        
        return ResponseEntity.ok(user);
    }

    @PutMapping
    public ResponseEntity<?> updateUserProfile(@RequestBody User updatedUser, Authentication auth) {
        String email = (String) auth.getPrincipal();
        User user = userRepository.findByEmail(email).orElse(null);
        
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Usuario no encontrado"));
        }
        
        // Actualizar solo los campos permitidos
        user.setNombre(updatedUser.getNombre());
        user.setApellidos(updatedUser.getApellidos());
        user.setUsuario(updatedUser.getUsuario());
        user.setCelular(updatedUser.getCelular());
        user.setFechaNacimiento(updatedUser.getFechaNacimiento());
        // NO actualizar photoUrl aquí - se maneja solo en el endpoint específico /photo
        
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Perfil actualizado exitosamente"));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> passwords, Authentication auth) {
        String email = (String) auth.getPrincipal();
        User user = userRepository.findByEmail(email).orElse(null);
        
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Usuario no encontrado"));
        }
        
        String currentPassword = passwords.get("currentPassword");
        String newPassword = passwords.get("newPassword");
        
        // Verificar contraseña actual
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            return ResponseEntity.status(400).body(Map.of("error", "Contraseña actual incorrecta"));
        }
        
        // Actualizar contraseña
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        
        return ResponseEntity.ok(Map.of("message", "Contraseña cambiada exitosamente"));
    }
    
    @PostMapping("/photo")
    public ResponseEntity<?> uploadProfilePhoto(
            @RequestParam("photo") MultipartFile file,
            Authentication auth) {
        
        System.out.println("=== UPLOAD PHOTO REQUEST RECEIVED ===");
        System.out.println("Authentication: " + (auth != null ? auth.getPrincipal() : "null"));
        System.out.println("File: " + (file != null ? file.getOriginalFilename() : "null"));
        
        String email = (String) auth.getPrincipal();
        User user = userRepository.findByEmail(email).orElse(null);
        
        if (user == null) {
            System.out.println("ERROR: User not found");
            return ResponseEntity.status(404).body(Map.of("error", "Usuario no encontrado"));
        }
        
        System.out.println("User found: " + user.getNombre());
        
        if (file.isEmpty()) {
            System.out.println("ERROR: File is empty");
            return ResponseEntity.status(400).body(Map.of("error", "No se ha seleccionado ningún archivo"));
        }
        
        // Validar tipo de archivo
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.status(400).body(Map.of("error", "El archivo debe ser una imagen"));
        }
        
        // Validar tamaño (máximo 5MB)
        if (file.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity.status(400).body(Map.of("error", "La imagen no debe superar los 5MB"));
        }
        
        try {
            // Usar directorio persistente en home del usuario
            String uploadsDir = Paths.get(System.getProperty("user.home"), "aetos-uploads", "profiles").toString();
            File directory = new File(uploadsDir);
            if (!directory.exists()) {
                directory.mkdirs();
                System.out.println("📁 Directorio de perfiles creado: " + uploadsDir);
            }
            
            // Generar nombre único para el archivo
            String originalFilename = file.getOriginalFilename();
            String extension = originalFilename != null && originalFilename.contains(".")
                    ? originalFilename.substring(originalFilename.lastIndexOf("."))
                    : ".jpg";
            String filename = "profile_" + user.getId() + "_" + UUID.randomUUID() + extension;
            
            // Guardar archivo
            Path filePath = Paths.get(uploadsDir, filename);
            Files.write(filePath, file.getBytes());
            
            System.out.println("📸 Foto guardada en: " + filePath.toAbsolutePath());
            
            // Eliminar foto anterior si existe
            if (user.getPhotoUrl() != null && !user.getPhotoUrl().isEmpty()) {
                try {
                    String oldFilename = user.getPhotoUrl().substring(user.getPhotoUrl().lastIndexOf("/") + 1);
                    Path oldFilePath = Paths.get(uploadsDir, oldFilename);
                    Files.deleteIfExists(oldFilePath);
                } catch (Exception e) {
                    System.err.println("Error al eliminar foto anterior: " + e.getMessage());
                }
            }
            
            // Actualizar URL en el usuario
            String photoUrl = "/uploads/profiles/" + filename;
            user.setPhotoUrl(photoUrl);
            userRepository.save(user);
            
            return ResponseEntity.ok(Map.of(
                "message", "Foto de perfil actualizada exitosamente",
                "photoUrl", photoUrl
            ));
            
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Error al guardar la imagen"));
        }
    }

    // Obtener cumpleaños próximos (todos los usuarios autenticados)
    @GetMapping("/birthdays/this-week")
    public ResponseEntity<?> getBirthdaysThisWeek(Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) {
            return ResponseEntity.status(401).body(Map.of("error", "No autenticado"));
        }

        LocalDate today = LocalDate.now();
        LocalDate sixDaysFromNow = today.plusDays(6); // 7 días total incluyendo hoy

        List<User> allUsers = userRepository.findAll();
        
        List<Map<String, Object>> birthdays = allUsers.stream()
            .filter(user -> user.getFechaNacimiento() != null)
            .filter(user -> user.getRol() != Role.ADMIN) // Excluir administradores - no participan en el grupo
            .filter(user -> {
                LocalDate birthday = user.getFechaNacimiento();
                int birthMonth = birthday.getMonthValue();
                int birthDay = birthday.getDayOfMonth();
                
                // Calcular el próximo cumpleaños (este año o el siguiente)
                LocalDate nextBirthday = LocalDate.of(today.getYear(), birthMonth, birthDay);
                
                // Si el cumpleaños de este año ya pasó, usar el del siguiente año
                if (nextBirthday.isBefore(today)) {
                    nextBirthday = LocalDate.of(today.getYear() + 1, birthMonth, birthDay);
                }
                
                // Mostrar si el cumpleaños está entre HOY y los próximos 6 días (7 días total)
                return !nextBirthday.isBefore(today) && !nextBirthday.isAfter(sixDaysFromNow);
            })
            .map(user -> {
                Map<String, Object> birthdayInfo = new HashMap<>();
                birthdayInfo.put("id", user.getId());
                birthdayInfo.put("nombre", user.getNombre());
                birthdayInfo.put("apellidos", user.getApellidos());
                birthdayInfo.put("fullName", user.getNombre() + " " + user.getApellidos());
                birthdayInfo.put("email", user.getEmail());
                birthdayInfo.put("fechaNacimiento", user.getFechaNacimiento());
                birthdayInfo.put("celular", user.getCelular());
                
                // Calcular edad que va a cumplir
                LocalDate birthday = user.getFechaNacimiento();
                LocalDate nextBirthday = LocalDate.of(today.getYear(), birthday.getMonthValue(), birthday.getDayOfMonth());
                if (nextBirthday.isBefore(today)) {
                    nextBirthday = LocalDate.of(today.getYear() + 1, birthday.getMonthValue(), birthday.getDayOfMonth());
                }
                
                int age = (int) ChronoUnit.YEARS.between(birthday, nextBirthday);
                birthdayInfo.put("age", age);
                
                // Verificar si es hoy
                boolean isToday = today.isEqual(nextBirthday);
                birthdayInfo.put("isToday", isToday);
                
                // Calcular días restantes
                long daysUntilBirthday = ChronoUnit.DAYS.between(today, nextBirthday);
                birthdayInfo.put("daysUntilBirthday", daysUntilBirthday);
                
                birthdayInfo.put("birthdayDate", nextBirthday);
                
                return birthdayInfo;
            })
            .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
            "birthdays", birthdays,
            "count", birthdays.size(),
            "today", today,
            "sixDaysFromNow", sixDaysFromNow
        ));
    }
    
    // Obtener asignaciones próximas del usuario (programas en los que participa)
    @GetMapping("/my-assignments")
    public ResponseEntity<?> getMyUpcomingAssignments(Authentication auth) {
        System.out.println("🚀 ===== INICIO ENDPOINT ASSIGNMENTS =====");
        
        if (auth == null || auth.getPrincipal() == null) {
            System.out.println("❌ No autenticado");
            return ResponseEntity.status(401).body(Map.of("error", "No autenticado"));
        }
        
        String email = (String) auth.getPrincipal();
        LocalDate today = LocalDate.now();
        LocalDate sevenDaysFromNow = today.plusDays(7);
        
        System.out.println("🔍 Usuario logueado: " + email);
        System.out.println("📅 Fecha actual: " + today);
        System.out.println("📅 Rango hasta: " + sevenDaysFromNow);
        
        // Primero obtener TODOS los programas para debug
        List<ProgramWeekly> allProgramsForDebug = programWeeklyRepository.findAll();
        System.out.println("🗂️ Total programas en DB: " + allProgramsForDebug.size());
        
        for (ProgramWeekly prog : allProgramsForDebug) {
            System.out.println("  📋 Programa ID " + prog.getId() + ":");
            System.out.println("    Fecha: " + prog.getWeekStart());
            System.out.println("    Confra: '" + prog.getResponsableConfraternizacion() + "'");
            System.out.println("    Dinámica: '" + prog.getResponsableDinamica() + "'");
            System.out.println("    Oración: '" + prog.getResponsableOracionIntercesora() + "'");
            System.out.println("    Tema: '" + prog.getResponsableTema() + "'");
            System.out.println("    Especial: '" + prog.getResponsableEspecial() + "'");
        }
        
        // Obtener todos los programas en el rango de fechas
        List<ProgramWeekly> allPrograms = programWeeklyRepository.findUpcomingProgramsByUserEmail(
            today, sevenDaysFromNow
        );
        
        System.out.println("🎯 Todos los programas en rango: " + allPrograms.size());
        
        // Obtener información del usuario actual
        User currentUser = userRepository.findByEmail(email).orElse(null);
        String userName = currentUser != null ? currentUser.getNombre() : "";
        String fullName = currentUser != null ? (currentUser.getNombre() + " " + currentUser.getApellidos()) : "";
        
        System.out.println("👤 Usuario actual: email='" + email + "', nombre='" + userName + "', completo='" + fullName + "'");
        
        // Filtrar manualmente los programas donde el usuario tiene responsabilidades
        List<ProgramWeekly> userPrograms = allPrograms.stream()
            .filter(program -> {
                boolean hasResponsibility = 
                    matchesUser(program.getResponsableConfraternizacion(), email, userName, fullName) ||
                    matchesUser(program.getResponsableDinamica(), email, userName, fullName) ||
                    matchesUser(program.getResponsableEspecial(), email, userName, fullName) ||
                    matchesUser(program.getResponsableOracionIntercesora(), email, userName, fullName) ||
                    matchesUser(program.getResponsableTema(), email, userName, fullName);
                
                System.out.println("  🔍 Programa " + program.getId() + " (" + program.getWeekStart() + ") - ¿Usuario tiene responsabilidad? " + hasResponsibility);
                return hasResponsibility;
            })
            .collect(Collectors.toList());
        
        System.out.println("📋 Programas donde usuario tiene responsabilidades: " + userPrograms.size());
        // Filtrar programas de hoy o futuros (aunque ya hayan iniciado)
        LocalDateTime now = LocalDateTime.now();
        System.out.println("⏰ Fecha/Hora actual: " + now);
        System.out.println("📅 Fecha hoy: " + today);
        
        List<Map<String, Object>> assignments = userPrograms.stream()
            .filter(program -> {
                // Mostrar programas del día actual o futuros
                try {
                    LocalDate programDate = program.getWeekStart();
                    LocalDateTime programDateTime = LocalDateTime.of(
                        programDate, 
                        LocalTime.parse(program.getHora())
                    );
                    // Incluir si es hoy o es futuro
                    boolean isCurrentOrFuture = !programDate.isBefore(today);
                    System.out.println("  📌 Programa " + program.getId() + " - Fecha: " + programDateTime + " - ¿Es hoy o futuro? " + isCurrentOrFuture);
                    return isCurrentOrFuture;
                } catch (Exception e) {
                    System.err.println("⚠️ Error parseando hora: " + program.getHora() + " - " + e.getMessage());
                    return false;
                }
            })
            .map(program -> {
                Map<String, Object> assignmentInfo = new HashMap<>();
                
                // Determinar qué responsabilidad tiene el usuario
                List<String> responsibilities = new ArrayList<>();
                
                System.out.println("  🔍 Verificando responsabilidades detalladas para programa " + program.getId() + ":");
                System.out.println("     🧑 Usuario: email='" + email + "', nombre='" + userName + "', completo='" + fullName + "'");
                System.out.println("     🎉 Confraternización: '" + program.getResponsableConfraternizacion() + "'");
                System.out.println("     🎮 Dinámica: '" + program.getResponsableDinamica() + "'");
                System.out.println("     ⭐ Especial: '" + program.getResponsableEspecial() + "'");
                System.out.println("     🙏 Oración: '" + program.getResponsableOracionIntercesora() + "'");
                System.out.println("     📖 Tema: '" + program.getResponsableTema() + "'");
                
                // Matching inteligente: tanto por email como por nombre
                if (matchesUser(program.getResponsableConfraternizacion(), email, userName, fullName)) {
                    responsibilities.add("Confraternización");
                    System.out.println("     ✅ Añadida: Confraternización");
                }
                if (matchesUser(program.getResponsableDinamica(), email, userName, fullName)) {
                    responsibilities.add("Dinámica");
                    System.out.println("     ✅ Añadida: Dinámica");
                }
                if (matchesUser(program.getResponsableEspecial(), email, userName, fullName)) {
                    responsibilities.add("Especial");
                    System.out.println("     ✅ Añadida: Especial");
                }
                if (matchesUser(program.getResponsableOracionIntercesora(), email, userName, fullName)) {
                    responsibilities.add("Oración Intercesora");
                    System.out.println("     ✅ Añadida: Oración Intercesora");
                }
                if (matchesUser(program.getResponsableTema(), email, userName, fullName)) {
                    responsibilities.add("Tema");
                    System.out.println("     ✅ Añadida: Tema");
                }
                
                System.out.println("     📝 Total responsabilidades: " + responsibilities.size() + " -> " + responsibilities);
                
                assignmentInfo.put("programId", program.getId());
                assignmentInfo.put("programDate", program.getWeekStart());
                assignmentInfo.put("programTime", program.getHora());
                assignmentInfo.put("programEndTime", program.getHoraFin());
                assignmentInfo.put("location", program.getLocation() != null ? program.getLocation().getName() : "Sin ubicación");
                assignmentInfo.put("responsibilities", responsibilities);
                
                // Calcular días restantes
                long daysUntil = ChronoUnit.DAYS.between(LocalDate.now(), program.getWeekStart());
                assignmentInfo.put("daysUntil", daysUntil);
                assignmentInfo.put("isToday", daysUntil == 0);
                
                System.out.println("     📅 Días restantes: " + daysUntil);
                
                return assignmentInfo;
            })
            .collect(Collectors.toList());
        
        System.out.println("✅ Asignaciones procesadas: " + assignments.size());
        System.out.println("🚀 ===== FIN ENDPOINT ASSIGNMENTS =====");
        
        Map<String, Object> response = Map.of(
            "assignments", assignments,
            "count", assignments.size()
        );
        
        System.out.println("📤 Respuesta enviada: " + response);
        
        return ResponseEntity.ok(response);
    }
    
    // ENDPOINT TEMPORAL: Corregir responsabilidades para usar emails
    @PostMapping("/fix-responsibilities")
    public ResponseEntity<?> fixResponsibilities(Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) {
            return ResponseEntity.status(401).body(Map.of("error", "No autenticado"));
        }
        
        String currentUserEmail = (String) auth.getPrincipal();
        
        // Solo permitir a administradores o al usuario serguei
        if (!currentUserEmail.equals("sergueilavrov2019@gmail.com")) {
            return ResponseEntity.status(403).body(Map.of("error", "No autorizado"));
        }
        
        System.out.println("🔧 Iniciando corrección de responsabilidades para TODOS los usuarios...");
        
        try {
            // Obtener todos los usuarios para crear mapeo nombre -> email
            List<User> allUsers = userRepository.findAll();
            Map<String, String> nameToEmailMap = new HashMap<>();
            
            System.out.println("👥 Usuarios encontrados:");
            for (User user : allUsers) {
                String fullName = user.getNombre() + " " + user.getApellidos();
                nameToEmailMap.put(user.getNombre().toLowerCase(), user.getEmail());
                nameToEmailMap.put(fullName.toLowerCase(), user.getEmail());
                // También mapear nombres específicos conocidos
                if (fullName.toLowerCase().contains("serguei")) {
                    nameToEmailMap.put("serguei lavrov", user.getEmail());
                }
                if (fullName.toLowerCase().contains("arturo")) {
                    nameToEmailMap.put("arturo oswaldo", user.getEmail());
                }
                System.out.println("  📧 " + fullName + " -> " + user.getEmail());
            }
            
            // Mapeos adicionales especiales
            nameToEmailMap.put("grupo aetos", "grupo@aetos.com");  // placeholder para grupos
            
            System.out.println("🗂️ Mapeo completo: " + nameToEmailMap);
            
            // Obtener todos los programas
            List<ProgramWeekly> allPrograms = programWeeklyRepository.findAll();
            int updated = 0;
            
            for (ProgramWeekly program : allPrograms) {
                boolean needsUpdate = false;
                
                System.out.println("🔍 Revisando programa " + program.getId() + ":");
                
                // Corregir cada campo de responsabilidad
                if (program.getResponsableConfraternizacion() != null && !program.getResponsableConfraternizacion().contains("@")) {
                    String originalName = program.getResponsableConfraternizacion().toLowerCase();
                    String email = nameToEmailMap.get(originalName);
                    if (email != null) {
                        program.setResponsableConfraternizacion(email);
                        needsUpdate = true;
                        System.out.println("  ✅ Confraternización: '" + originalName + "' -> '" + email + "'");
                    }
                }
                
                if (program.getResponsableDinamica() != null && !program.getResponsableDinamica().contains("@")) {
                    String originalName = program.getResponsableDinamica().toLowerCase();
                    String email = nameToEmailMap.get(originalName);
                    if (email != null) {
                        program.setResponsableDinamica(email);
                        needsUpdate = true;
                        System.out.println("  ✅ Dinámica: '" + originalName + "' -> '" + email + "'");
                    }
                }
                
                if (program.getResponsableEspecial() != null && !program.getResponsableEspecial().contains("@")) {
                    String originalName = program.getResponsableEspecial().toLowerCase();
                    String email = nameToEmailMap.get(originalName);
                    if (email != null) {
                        program.setResponsableEspecial(email);
                        needsUpdate = true;
                        System.out.println("  ✅ Especial: '" + originalName + "' -> '" + email + "'");
                    }
                }
                
                if (program.getResponsableOracionIntercesora() != null && !program.getResponsableOracionIntercesora().contains("@")) {
                    String originalName = program.getResponsableOracionIntercesora().toLowerCase();
                    String email = nameToEmailMap.get(originalName);
                    if (email != null) {
                        program.setResponsableOracionIntercesora(email);
                        needsUpdate = true;
                        System.out.println("  ✅ Oración: '" + originalName + "' -> '" + email + "'");
                    }
                }
                
                if (program.getResponsableTema() != null && !program.getResponsableTema().contains("@")) {
                    String originalName = program.getResponsableTema().toLowerCase();
                    String email = nameToEmailMap.get(originalName);
                    if (email != null) {
                        program.setResponsableTema(email);
                        needsUpdate = true;
                        System.out.println("  ✅ Tema: '" + originalName + "' -> '" + email + "'");
                    }
                }
                
                if (needsUpdate) {
                    programWeeklyRepository.save(program);
                    updated++;
                    System.out.println("  💾 Programa " + program.getId() + " actualizado");
                }
            }
            
            System.out.println("🎉 Corrección completada: " + updated + " programas actualizados");
            
            return ResponseEntity.ok(Map.of(
                "message", "Responsabilidades corregidas exitosamente para todos los usuarios",
                "programsUpdated", updated,
                "userMappings", nameToEmailMap
            ));
            
        } catch (Exception e) {
            System.err.println("❌ Error corrigiendo responsabilidades: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "Error interno del servidor"));
        }
    }
    
    // Método helper para matching inteligente de usuarios
    private boolean matchesUser(String assignedValue, String userEmail, String userName, String fullName) {
        if (assignedValue == null || assignedValue.trim().isEmpty()) {
            return false;
        }
        
        String assigned = assignedValue.trim();
        
        // Matching por email exacto 
        if (assigned.equals(userEmail)) {
            System.out.println("       ✅ Match por email: '" + assigned + "' == '" + userEmail + "'");
            return true;
        }
        
        // Matching por nombre exacto (case insensitive)
        if (assigned.equalsIgnoreCase(userName.trim())) {
            System.out.println("       ✅ Match por nombre: '" + assigned + "' ~= '" + userName + "'");
            return true;
        }
        
        // Matching por nombre completo (case insensitive)
        if (assigned.equalsIgnoreCase(fullName.trim())) {
            System.out.println("       ✅ Match por nombre completo: '" + assigned + "' ~= '" + fullName + "'");
            return true;
        }
        
        // Matching parcial más flexible
        if (assigned.toLowerCase().contains(userName.toLowerCase()) && userName.length() > 2) {
            System.out.println("       ✅ Match parcial (contiene nombre): '" + assigned + "' contiene '" + userName + "'");
            return true;
        }
        
        if (userName.toLowerCase().contains(assigned.toLowerCase()) && assigned.length() > 2) {
            System.out.println("       ✅ Match parcial (nombre contiene): '" + userName + "' contiene '" + assigned + "'");
            return true;
        }
        
        System.out.println("       ❌ Sin match: '" + assigned + "' vs email='" + userEmail + "', nombre='" + userName + "', completo='" + fullName + "'");
        return false;
    }
}
