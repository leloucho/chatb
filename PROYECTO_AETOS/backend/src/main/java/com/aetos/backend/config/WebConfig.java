package com.aetos.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Obtener directorio actual del usuario para almacenamiento persistente
        String uploadsPath = Paths.get(System.getProperty("user.home"), "aetos-uploads").toAbsolutePath().toString();
        
        // Servir archivos estáticos desde ~/aetos-uploads/
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + uploadsPath + "/");
        
        System.out.println("✅ Directorio de uploads configurado en: " + uploadsPath);
    }
}
