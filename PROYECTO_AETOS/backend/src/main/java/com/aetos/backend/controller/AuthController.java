package com.aetos.backend.controller;

import com.aetos.backend.model.PasswordResetToken;
import com.aetos.backend.model.Role;
import com.aetos.backend.model.User;
import com.aetos.backend.model.VerificationToken;
import com.aetos.backend.repository.PasswordResetTokenRepository;
import com.aetos.backend.repository.UserRepository;
import com.aetos.backend.repository.VerificationTokenRepository;
import com.aetos.backend.security.JwtUtil;
import com.aetos.backend.service.EmailService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;
    private final VerificationTokenRepository tokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;

    @Value("${auth.requireEmailVerification:true}")
    private boolean requireEmailVerification;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder, 
                         JwtUtil jwtUtil, EmailService emailService,
                         VerificationTokenRepository tokenRepository,
                         PasswordResetTokenRepository passwordResetTokenRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.emailService = emailService;
        this.tokenRepository = tokenRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody User user) {
        String normalizedEmail = user.getEmail() != null ? user.getEmail().trim().toLowerCase() : "";
        if (userRepository.findByEmailIgnoreCase(normalizedEmail).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email ya está en uso"));
        }
        
        // Validaciones adicionales
        if (user.getNombre() == null || user.getNombre().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El nombre es requerido"));
        }
        if (user.getApellidos() == null || user.getApellidos().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Los apellidos son requeridos"));
        }
        if (user.getUsuario() == null || user.getUsuario().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El usuario es requerido"));
        }
        if (user.getFechaNacimiento() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "La fecha de nacimiento es requerida"));
        }
        
        user.setEmail(normalizedEmail);
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        if (user.getRol() == null) user.setRol(Role.MIEMBRO);
        user.setEmailVerified(false);
        userRepository.save(user);
        
        // Generar token de verificación
        String token = UUID.randomUUID().toString();
        VerificationToken verificationToken = VerificationToken.builder()
                .token(token)
                .user(user)
                .expiryDate(LocalDateTime.now().plusHours(24))
                .build();
        tokenRepository.save(verificationToken);
        
        // Enviar email
        emailService.sendVerificationEmail(user.getEmail(), token);
        
        return ResponseEntity.ok(Map.of("message", "Registro exitoso. Por favor verifica tu correo."));
    }
    
    @GetMapping("/verify")
    public ResponseEntity<?> verifyEmail(@RequestParam String token) {
        var tokenOpt = tokenRepository.findByToken(token);
        if (tokenOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Token inválido"));
        }
        
        VerificationToken verificationToken = tokenOpt.get();
        if (verificationToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Token expirado"));
        }
        
        User user = verificationToken.getUser();
        user.setEmailVerified(true);
        userRepository.save(user);
        tokenRepository.delete(verificationToken);
        
        return ResponseEntity.ok(Map.of("message", "Email verificado exitosamente"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String email = (body.get("email") != null ? body.get("email").trim().toLowerCase() : "");
        String password = body.get("password");
        var opt = userRepository.findByEmailIgnoreCase(email);
        if (opt.isEmpty()) {
            System.out.println("[Login] Usuario no encontrado: " + email);
            return ResponseEntity.status(401).body(Map.of("error", "Credenciales inválidas"));
        }
        var user = opt.get();
        
        if (requireEmailVerification && !user.isEmailVerified()) {
            System.out.println("[Login] Email no verificado y verificación requerida: " + email);
            return ResponseEntity.status(403).body(Map.of("error", "Por favor verifica tu email antes de iniciar sesión"));
        }
        
        boolean passOk = passwordEncoder.matches(password != null ? password : "", user.getPassword());
        System.out.println("[Login] email=" + email + ", passOk=" + passOk + ", hashPrefix=" + (user.getPassword() != null ? user.getPassword().substring(0, 7) : "null") + "...");
        if (!passOk) {
            return ResponseEntity.status(401).body(Map.of("error", "Credenciales inválidas"));
        }
        
        String token = jwtUtil.generateToken(user.getEmail());
        return ResponseEntity.ok(Map.of("token", token, "role", user.getRol(), "usuario", user.getUsuario()));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String email = (body.get("email") != null ? body.get("email").trim().toLowerCase() : "");
        var userOpt = userRepository.findByEmailIgnoreCase(email);
        
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No existe una cuenta con ese correo"));
        }
        
        User user = userOpt.get();
        String token = UUID.randomUUID().toString();
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .token(token)
                .user(user)
                .expiryDate(LocalDateTime.now().plusHours(1))
                .build();
        passwordResetTokenRepository.save(resetToken);
        
        emailService.sendPasswordResetEmail(user.getEmail(), token);
        
        return ResponseEntity.ok(Map.of("message", "Se ha enviado un enlace a tu correo"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        String newPassword = body.get("newPassword");
        
        var tokenOpt = passwordResetTokenRepository.findByToken(token);
        if (tokenOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Token inválido"));
        }
        
        PasswordResetToken resetToken = tokenOpt.get();
        if (resetToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Token expirado"));
        }
        
        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        passwordResetTokenRepository.delete(resetToken);
        
        return ResponseEntity.ok(Map.of("message", "Contraseña actualizada correctamente"));
    }
}
