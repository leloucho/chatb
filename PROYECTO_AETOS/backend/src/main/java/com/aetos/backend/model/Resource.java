package com.aetos.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "resources")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Resource {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String nombre;
    
    @Column(nullable = false)
    private String nombreArchivo; // Nombre del archivo en el servidor
    
    @Column(nullable = false)
    private String rutaArchivo; // Ruta completa del archivo PDF
    
    @Column(nullable = false)
    private String rutaPortada; // Ruta de la imagen de portada generada
    
    @Column(nullable = false)
    private String usuarioEmail; // Email del usuario que subió el archivo
    
    @Column(nullable = false)
    private String usuarioNombre; // Nombre del usuario que subió
    
    @Column(nullable = false)
    private LocalDateTime fechaSubida;
    
    @Column
    private Long tamanioBytes;
    
    @Column
    private String descripcion;
}
