package com.aetos.backend.controller;

import com.aetos.backend.model.Role;
import com.aetos.backend.model.User;
import com.aetos.backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin-change")
public class AdminChangeController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminChangeController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // Crear admin por defecto si no existe
    @PostMapping("/bootstrap-admin")
    public ResponseEntity<?> bootstrapAdmin() {
        String email = "admin@aetos.com";
        var existing = userRepository.findByEmail(email);
        if (existing.isPresent()) {
            return ResponseEntity.ok(Map.of("message", "Admin ya existe", "email", email));
        }
        User admin = User.builder()
                .nombre("Admin")
                .apellidos("Principal")
                .usuario("admin")
                .email(email)
                .password(passwordEncoder.encode("admin"))
                .rol(Role.ADMIN)
                .emailVerified(true)
                .build();
        userRepository.save(admin);
        return ResponseEntity.ok(Map.of("message", "Admin creado", "email", email));
    }

    // Resetear contraseña del admin (desarrollo)
    @PostMapping("/reset-admin-password")
    public ResponseEntity<?> resetAdminPassword(@RequestBody(required = false) Map<String, String> body) {
        String newPass = body != null && body.get("password") != null ? body.get("password") : "admin";
        var existing = userRepository.findByEmail("aetos.grupo@gmail.com");
        if (existing.isEmpty()) existing = userRepository.findByEmail("admin@aetos.com");
        if (existing.isEmpty()) {
            // Buscar cualquier ADMIN
            var anyAdmin = userRepository.findAll().stream().filter(u -> u.getRol() == Role.ADMIN).findFirst();
            if (anyAdmin.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "No hay usuario ADMIN"));
            existing = anyAdmin;
        }
        var admin = existing.get();
        admin.setPassword(passwordEncoder.encode(newPass));
        admin.setEmailVerified(true);
        userRepository.save(admin);
        return ResponseEntity.ok(Map.of("message", "Contraseña de admin actualizada"));
    }

    // Cambiar email y contraseña del ADMIN existente
    @PostMapping("/set-admin-credentials")
    public ResponseEntity<?> setAdminCredentials(@RequestBody Map<String, String> body) {
        String newEmail = body.getOrDefault("email", "aetos.grupo@gmail.com");
        String newPass = body.getOrDefault("password", "AetosAdmin2026*");

        // localizar admin actual
        var opt = userRepository.findByEmail("aetos.grupo@gmail.com");
        if (opt.isEmpty()) opt = userRepository.findByEmail("admin@aetos.com");
        if (opt.isEmpty()) {
            var anyAdmin = userRepository.findAll().stream().filter(u -> u.getRol() == Role.ADMIN).findFirst();
            if (anyAdmin.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "No hay usuario ADMIN para actualizar"));
            opt = anyAdmin;
        }
        var admin = opt.get();

        // evitar colisión de email si pertenece a otro usuario
        var collision = userRepository.findByEmail(newEmail);
        if (collision.isPresent() && !collision.get().getId().equals(admin.getId())) {
            return ResponseEntity.badRequest().body(Map.of("error", "El email ya está en uso"));
        }

        admin.setEmail(newEmail);
        admin.setPassword(passwordEncoder.encode(newPass));
        admin.setEmailVerified(true);
        userRepository.save(admin);
        return ResponseEntity.ok(Map.of("message", "Credenciales del admin actualizadas", "email", newEmail));
    }

    // Endpoint temporal para cambiar roles sin autenticación
    @PostMapping("/change-roles")
    public ResponseEntity<?> changeRoles(@RequestBody Map<String, String> body) {
        String oldAdminEmail = body.get("oldAdminEmail");
        String newAdminEmail = body.get("newAdminEmail");

        // Cambiar el admin actual a LIDER
        User oldAdmin = userRepository.findByEmail(oldAdminEmail).orElse(null);
        if (oldAdmin != null) {
            oldAdmin.setRol(Role.LIDER);
            userRepository.save(oldAdmin);
        } else {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario antiguo no encontrado: " + oldAdminEmail));
        }

        // Cambiar el nuevo usuario a ADMIN
        User newAdmin = userRepository.findByEmail(newAdminEmail).orElse(null);
        if (newAdmin != null) {
            newAdmin.setRol(Role.ADMIN);
            userRepository.save(newAdmin);
        } else {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario nuevo no encontrado: " + newAdminEmail));
        }

        return ResponseEntity.ok(Map.of(
            "message", "Roles actualizados exitosamente",
            "oldAdmin", oldAdminEmail + " -> LIDER",
            "newAdmin", newAdminEmail + " -> ADMIN"
        ));
    }

    // Endpoint para verificar usuarios
    @GetMapping("/check-users")
    public ResponseEntity<?> checkUsers() {
        var users = userRepository.findAll();
        var usersInfo = users.stream().map(u -> Map.of(
            "email", u.getEmail(),
            "nombre", u.getNombre() + " " + u.getApellidos(),
            "rol", u.getRol().toString()
        )).toList();
        
        return ResponseEntity.ok(usersInfo);
    }
}
