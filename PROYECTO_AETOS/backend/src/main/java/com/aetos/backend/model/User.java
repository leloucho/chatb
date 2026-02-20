package com.aetos.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String nombre;

    @NotBlank
    private String apellidos;

    @NotBlank
    @Column(unique = true)
    private String usuario; // alias para la aplicación

    private String celular;

    private LocalDate fechaNacimiento;

    @Email
    @Column(unique = true)
    private String email;

    @NotBlank
    private String password;

    @Enumerated(EnumType.STRING)
    private Role rol;

    private boolean emailVerified;
    
    private String photoUrl; // URL de la foto de perfil
}
