package com.aetos.backend.model;

public enum Role {
    ADMIN,      // Administrador principal (puede cambiar roles, gestión total)
    LIDER,      // Líder (gestiona reuniones, programas, notificaciones)
    MIEMBRO     // Miembro regular (solo funciones básicas)
}
