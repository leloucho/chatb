package com.aetos.backend.controller;

import com.aetos.backend.model.Role;
import com.aetos.backend.model.User;
import com.aetos.backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
public class UserManagementController {

    private final UserRepository userRepository;

    public UserManagementController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // Listar todos los usuarios (solo ADMIN)
    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(Authentication auth) {
        String email = (String) auth.getPrincipal();
        User admin = userRepository.findByEmail(email).orElse(null);
        
        if (admin == null || admin.getRol() != Role.ADMIN) {
            return ResponseEntity.status(403).body(Map.of("error", "Solo el administrador puede ver todos los usuarios"));
        }
        
        List<User> users = userRepository.findAll();
        
        // Convertir a DTOs para evitar problemas de serialización
        List<Map<String, Object>> userDTOs = users.stream().map(user -> {
            Map<String, Object> userMap = new HashMap<>();
            userMap.put("id", user.getId());
            userMap.put("nombre", user.getNombre());
            userMap.put("apellidos", user.getApellidos());
            userMap.put("usuario", user.getUsuario());
            userMap.put("email", user.getEmail());
            userMap.put("celular", user.getCelular());
            userMap.put("fechaNacimiento", user.getFechaNacimiento());
            userMap.put("emailVerified", user.isEmailVerified());
            userMap.put("photoUrl", user.getPhotoUrl());
            userMap.put("rol", user.getRol() != null ? user.getRol().name() : "MIEMBRO"); // Asegurar que el enum se serializa como string
            System.out.println("🔍 Usuario: " + user.getNombre() + " - Rol: " + user.getRol() + " - Serializado: " + (user.getRol() != null ? user.getRol().name() : "null"));
            return userMap;
        }).collect(Collectors.toList());
        
        System.out.println("📤 Devolviendo " + userDTOs.size() + " usuarios");
        System.out.println("📋 Primer usuario: " + userDTOs.get(0));
        return ResponseEntity.ok(userDTOs);
    }

    // Cambiar rol de un usuario (solo ADMIN)
    @PutMapping("/users/{id}/role")
    public ResponseEntity<?> changeUserRole(@PathVariable Long id, @RequestBody Map<String, String> payload, Authentication auth) {
        String email = (String) auth.getPrincipal();
        User admin = userRepository.findByEmail(email).orElse(null);
        
        if (admin == null || admin.getRol() != Role.ADMIN) {
            return ResponseEntity.status(403).body(Map.of("error", "Solo el administrador puede cambiar roles"));
        }
        
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Usuario no encontrado"));
        }
        
        // Prevenir que se cambie el rol del propio admin
        if (user.getEmail().equals(admin.getEmail())) {
            return ResponseEntity.status(400).body(Map.of("error", "No puedes cambiar tu propio rol"));
        }
        
        // Prevenir que se cambie el rol de cualquier ADMIN (protección adicional)
        if (user.getRol() == Role.ADMIN) {
            return ResponseEntity.status(400).body(Map.of("error", "No se puede cambiar el rol de un Administrador"));
        }
        
        String newRole = payload.get("role");
        try {
            Role role = Role.valueOf(newRole.toUpperCase());
            user.setRol(role);
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "Rol actualizado exitosamente", "user", user));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(400).body(Map.of("error", "Rol inválido"));
        }
    }

    // Eliminar usuario (solo ADMIN)
    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id, Authentication auth) {
        String email = (String) auth.getPrincipal();
        User admin = userRepository.findByEmail(email).orElse(null);
        
        if (admin == null || admin.getRol() != Role.ADMIN) {
            return ResponseEntity.status(403).body(Map.of("error", "Solo el administrador puede eliminar usuarios"));
        }
        
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Usuario no encontrado"));
        }
        
        // Prevenir que se elimine a sí mismo
        if (user.getEmail().equals(admin.getEmail())) {
            return ResponseEntity.status(400).body(Map.of("error", "No puedes eliminarte a ti mismo"));
        }
        
        // Prevenir eliminar cualquier cuenta ADMIN (protección crítica)
        if (user.getRol() == Role.ADMIN) {
            return ResponseEntity.status(400).body(Map.of("error", "No se pueden eliminar cuentas de Administrador"));
        }
        
        userRepository.delete(user);
        return ResponseEntity.ok(Map.of("message", "Usuario eliminado exitosamente"));
    }
}
