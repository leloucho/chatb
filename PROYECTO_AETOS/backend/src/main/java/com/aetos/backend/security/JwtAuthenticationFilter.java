package com.aetos.backend.security;

import com.aetos.backend.repository.UserRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(JwtUtil jwtUtil, UserRepository userRepository) {
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String requestPath = request.getRequestURI();
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        
        System.out.println("🔐 JWT Filter - Path: " + requestPath + " | Auth header: " + (header != null ? "Present" : "Missing"));
        
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            System.out.println("🎫 Token detectado: " + token.substring(0, Math.min(20, token.length())) + "...");
            if (jwtUtil.validateToken(token)) {
                String email = jwtUtil.getSubject(token);
                System.out.println("✅ Token válido para: " + email);
                userRepository.findByEmail(email).ifPresent(user -> {
                    var auth = new UsernamePasswordAuthenticationToken(
                            user.getEmail(), null, List.of(new SimpleGrantedAuthority(user.getRol().name())));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                    System.out.println("🔓 Autenticación establecida para: " + email + " con rol: " + user.getRol());
                });
            } else {
                System.err.println("❌ Token inválido!");
            }
        } else {
            System.out.println("⚠️ No hay token de autenticación");
        }
        filterChain.doFilter(request, response);
    }
}
