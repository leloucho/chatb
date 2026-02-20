package com.aetos.backend.security;

import com.aetos.backend.model.Role;
import com.aetos.backend.model.User;
import com.aetos.backend.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/admin-change/**").permitAll()
                        .requestMatchers("/api/admin/**").hasAuthority("ADMIN")
                        .requestMatchers("/api/leader/**").hasAnyAuthority("ADMIN", "LIDER")
                        .requestMatchers("/api/ranking").permitAll()
                        .requestMatchers("/api/notifications/active").authenticated()
                        .requestMatchers("/api/resources/thumbnail/**").permitAll() // Thumbnails públicos
                        .requestMatchers("/api/resources/download/**").authenticated() // Downloads requieren auth
                        .requestMatchers("/api/resources/**").authenticated() // Otros recursos requieren auth
                        .requestMatchers("/uploads/**").permitAll() // Permitir acceso a archivos subidos
                        .requestMatchers("/", "/*.js", "/*.css", "/*.ico", "/assets/**").permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public org.springframework.web.cors.CorsConfigurationSource corsConfigurationSource() {
        var config = new org.springframework.web.cors.CorsConfiguration();
        config.addAllowedOriginPattern("*");
        config.setAllowedMethods(java.util.List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS"));
        config.setAllowedHeaders(java.util.List.of("*"));
        config.setExposedHeaders(java.util.List.of("Authorization","Content-Disposition"));
        config.setAllowCredentials(true);
        var source = new org.springframework.web.cors.UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public CommandLineRunner createDefaultAdmin(UserRepository userRepository, PasswordEncoder encoder) {
        return args -> {
            String adminEmail = "aetos.grupo@gmail.com";
            userRepository.findByEmail(adminEmail).ifPresentOrElse(u -> {}, () -> {
                User admin = User.builder()
                        .nombre("Admin")
                        .apellidos("Principal")
                        .usuario("admin")
                        .email(adminEmail)
                        .password(encoder.encode("AetosAdmin2026*"))
                        .rol(Role.ADMIN)
                        .emailVerified(true)
                        .build();
                userRepository.save(admin);
                System.out.println("[Bootstrap] Usuario ADMIN creado: " + adminEmail + " / AetosAdmin2026*");
            });
        };
    }
}
