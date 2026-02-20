package com.aetos.backend.controller;

import com.aetos.backend.model.Resource;
import com.aetos.backend.model.User;
import com.aetos.backend.repository.ResourceRepository;
import com.aetos.backend.repository.UserRepository;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/resources")
@CrossOrigin(origins = "*")
public class ResourceController {

    private final ResourceRepository resourceRepository;
    private final UserRepository userRepository;
    private final String uploadDir = System.getProperty("user.home") + "/aetos-resources/";
    private final String thumbnailDir = System.getProperty("user.home") + "/aetos-resources/thumbnails/";

    public ResourceController(ResourceRepository resourceRepository, UserRepository userRepository) {
        this.resourceRepository = resourceRepository;
        this.userRepository = userRepository;
        
        // Crear directorios si no existen
        try {
            Files.createDirectories(Paths.get(uploadDir));
            Files.createDirectories(Paths.get(thumbnailDir));
        } catch (IOException e) {
            System.err.println("Error creando directorios: " + e.getMessage());
        }
    }
    
    private boolean canEditOrDeleteResource(String userEmail, Resource resource) {
        boolean isOwner = resource.getUsuarioEmail() != null && resource.getUsuarioEmail().equals(userEmail);
        if (isOwner) {
            System.out.println("[Resources] Permiso: propietario");
            return true;
        }
        User user = userRepository.findByEmail(userEmail).orElse(null);
        if (user == null) {
            System.out.println("[Resources] Usuario no encontrado: " + userEmail);
            return false;
        }
        String role = user.getRol().name();
        boolean elevated = "ADMIN".equals(role) || "LIDER".equals(role);
        System.out.println("[Resources] Rol=" + role + ", elevated=" + elevated);
        return elevated;
    }

    @GetMapping
    public ResponseEntity<List<Resource>> getAllResources() {
        try {
            List<Resource> resources = resourceRepository.findAllByOrderByFechaSubidaDesc();
            return ResponseEntity.ok(resources);
        } catch (Exception e) {
            System.err.println("Error obteniendo recursos: " + e.getMessage());
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/my-resources")
    public ResponseEntity<List<Resource>> getMyResources(Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) {
            return ResponseEntity.status(401).build();
        }
        
        String email = (String) auth.getPrincipal();
        try {
            List<Resource> resources = resourceRepository.findByUsuarioEmailOrderByFechaSubidaDesc(email);
            return ResponseEntity.ok(resources);
        } catch (Exception e) {
            System.err.println("Error obteniendo mis recursos: " + e.getMessage());
            return ResponseEntity.status(500).build();
        }
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadResource(
            @RequestParam("file") MultipartFile file,
            @RequestParam("nombre") String nombre,
            @RequestParam(value = "descripcion", required = false) String descripcion,
            Authentication auth) {
        
        System.out.println("🚀 ===== INICIO UPLOAD RECURSO =====");
        System.out.println("📁 Archivo: " + (file != null ? file.getOriginalFilename() : "null"));
        System.out.println("📝 Nombre: " + nombre);
        System.out.println("🔐 Auth: " + (auth != null ? auth.getPrincipal() : "null"));
        
        if (auth == null || auth.getPrincipal() == null) {
            System.err.println("❌ No autenticado!");
            return ResponseEntity.status(401).body(Map.of("error", "No autenticado"));
        }
        
        String email = (String) auth.getPrincipal();
        
        try {
            // Validación de tipos permitidos
            String originalName = file.getOriginalFilename();
            String ext = getFileExtension(originalName).toLowerCase();
            if (ext.isEmpty()) {
                String ct = file.getContentType() != null ? file.getContentType() : "";
                if (ct.startsWith("image/")) ext = "png";
                else if (ct.contains("pdf")) ext = "pdf";
            }
            if (!List.of("pdf","doc","docx","xls","xlsx","ppt","pptx","png","jpg","jpeg","gif","webp").contains(ext)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Tipo de archivo no permitido"));
            }
            
            // Obtener información del usuario
            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Usuario no encontrado"));
            }
            
            // Generar nombre único preservando extensión
            String uniqueFileName = UUID.randomUUID().toString() + "." + ext;
            String filePath = uploadDir + uniqueFileName;
            
            // Guardar el archivo
            File destinationFile = new File(filePath);
            file.transferTo(destinationFile);
            
            // Generar thumbnail
            String thumbnailFileName = UUID.randomUUID().toString() + ".png";
            String thumbnailPath = thumbnailDir + thumbnailFileName;
            if ("pdf".equals(ext)) {
                generateThumbnail(filePath, thumbnailPath);
            } else if (isImageExt(ext)) {
                generateImageThumbnail(filePath, thumbnailPath);
            } else {
                generatePlaceholderThumbnail(ext.toUpperCase(), thumbnailPath);
            }
            
            // Crear el registro en la base de datos
            Resource resource = Resource.builder()
                    .nombre(nombre)
                    .nombreArchivo(originalName)
                    .rutaArchivo(uniqueFileName)
                    .rutaPortada(thumbnailFileName)
                    .usuarioEmail(email)
                    .usuarioNombre(user.getNombre() + " " + user.getApellidos())
                    .fechaSubida(LocalDateTime.now())
                    .tamanioBytes(file.getSize())
                    .descripcion(descripcion)
                    .build();
            
            Resource savedResource = resourceRepository.save(resource);
            
            return ResponseEntity.ok(Map.of(
                    "message", "Recurso subido exitosamente",
                    "resource", savedResource
            ));
            
        } catch (Exception e) {
            System.err.println("Error subiendo recurso: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Error al subir el archivo: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateResource(
            @PathVariable Long id,
            @RequestParam("nombre") String nombre,
            @RequestParam(value = "descripcion", required = false) String descripcion,
            Authentication auth) {
        
        if (auth == null || auth.getPrincipal() == null) {
            return ResponseEntity.status(401).body(Map.of("error", "No autenticado"));
        }
        
        String email = (String) auth.getPrincipal();
        
        try {
            Resource resource = resourceRepository.findById(id).orElse(null);
            if (resource == null) {
                return ResponseEntity.status(404).body(Map.of("error", "Recurso no encontrado"));
            }
            
            // Verificar permisos (propietario o líder/admin)
            if (!canEditOrDeleteResource(email, resource)) {
                return ResponseEntity.status(403).body(Map.of("error", "No tienes permiso para editar este recurso"));
            }
            
            resource.setNombre(nombre);
            resource.setDescripcion(descripcion);
            resourceRepository.save(resource);
            
            return ResponseEntity.ok(Map.of(
                    "message", "Recurso actualizado exitosamente",
                    "resource", resource
            ));
            
        } catch (Exception e) {
            System.err.println("Error actualizando recurso: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "Error al actualizar el recurso"));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteResource(@PathVariable Long id, Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) {
            return ResponseEntity.status(401).body(Map.of("error", "No autenticado"));
        }
        
        String email = (String) auth.getPrincipal();
        
        try {
            Resource resource = resourceRepository.findById(id).orElse(null);
            if (resource == null) {
                return ResponseEntity.status(404).body(Map.of("error", "Recurso no encontrado"));
            }
            
            // Verificar permisos (propietario o líder/admin)
            if (!canEditOrDeleteResource(email, resource)) {
                return ResponseEntity.status(403).body(Map.of("error", "No tienes permiso para eliminar este recurso"));
            }
            
            // Eliminar archivos físicos
            try {
                Files.deleteIfExists(Paths.get(uploadDir + resource.getRutaArchivo()));
                Files.deleteIfExists(Paths.get(thumbnailDir + resource.getRutaPortada()));
            } catch (IOException e) {
                System.err.println("Error eliminando archivos físicos: " + e.getMessage());
            }
            
            resourceRepository.delete(resource);
            
            return ResponseEntity.ok(Map.of("message", "Recurso eliminado exitosamente"));
            
        } catch (Exception e) {
            System.err.println("Error eliminando recurso: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "Error al eliminar el recurso"));
        }
    }

    @GetMapping("/download/{id}")
    public ResponseEntity<?> downloadResource(@PathVariable Long id) {
        try {
            Resource resource = resourceRepository.findById(id).orElse(null);
            if (resource == null) {
                return ResponseEntity.status(404).body("Recurso no encontrado");
            }
            
            Path filePath = Paths.get(uploadDir + resource.getRutaArchivo());
            if (!Files.exists(filePath)) {
                return ResponseEntity.status(404).body("Archivo no encontrado");
            }
            
            byte[] fileContent = Files.readAllBytes(filePath);
            
            MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
            try {
                String probed = Files.probeContentType(filePath);
                if (probed != null) mediaType = MediaType.parseMediaType(probed);
            } catch (Exception ignore) {}
            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getNombreArchivo() + "\"")
                    .body(fileContent);
                    
        } catch (Exception e) {
            System.err.println("Error descargando recurso: " + e.getMessage());
            return ResponseEntity.status(500).body("Error al descargar el archivo");
        }
    }

    @GetMapping("/thumbnail/{filename}")
    public ResponseEntity<?> getThumbnail(@PathVariable String filename) {
        try {
            Path thumbnailPath = Paths.get(thumbnailDir + filename);
            if (!Files.exists(thumbnailPath)) {
                return ResponseEntity.status(404).build();
            }
            
            byte[] imageContent = Files.readAllBytes(thumbnailPath);
            
            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_PNG)
                    .body(imageContent);
                    
        } catch (Exception e) {
            System.err.println("Error obteniendo thumbnail: " + e.getMessage());
            return ResponseEntity.status(500).build();
        }
    }

    private void generateThumbnail(String pdfPath, String thumbnailPath) throws IOException {
        try (PDDocument document = PDDocument.load(new File(pdfPath))) {
            PDFRenderer pdfRenderer = new PDFRenderer(document);
            java.awt.image.BufferedImage bufferedImage = pdfRenderer.renderImageWithDPI(0, 150);
            ImageIO.write(bufferedImage, "PNG", new File(thumbnailPath));
            System.out.println("Thumbnail generado exitosamente: " + thumbnailPath);
        } catch (Exception e) {
            System.err.println("Error generando thumbnail: " + e.getMessage());
            throw new IOException("No se pudo generar la miniatura del PDF", e);
        }
    }

    private boolean isImageExt(String ext) {
        return List.of("png","jpg","jpeg","gif","webp").contains(ext);
    }

    private String getFileExtension(String filename) {
        if (filename == null) return "";
        int i = filename.lastIndexOf('.');
        return i >= 0 ? filename.substring(i + 1) : "";
    }

    private void generateImageThumbnail(String imagePath, String thumbnailPath) throws IOException {
        java.awt.image.BufferedImage img = ImageIO.read(new File(imagePath));
        if (img == null) throw new IOException("No se pudo leer la imagen");
        int w = img.getWidth();
        int h = img.getHeight();
        int tw = 300;
        int th = Math.max(1, (int) ((double) h / w * tw));
        java.awt.image.BufferedImage out = new java.awt.image.BufferedImage(tw, th, java.awt.image.BufferedImage.TYPE_INT_ARGB);
        java.awt.Graphics2D g = out.createGraphics();
        g.setRenderingHint(java.awt.RenderingHints.KEY_INTERPOLATION, java.awt.RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.drawImage(img, 0, 0, tw, th, null);
        g.dispose();
        ImageIO.write(out, "PNG", new File(thumbnailPath));
    }

    private void generatePlaceholderThumbnail(String label, String thumbnailPath) throws IOException {
        int w = 300, h = 400;
        java.awt.image.BufferedImage out = new java.awt.image.BufferedImage(w, h, java.awt.image.BufferedImage.TYPE_INT_ARGB);
        java.awt.Graphics2D g = out.createGraphics();
        g.setColor(new java.awt.Color(59, 130, 246));
        g.fillRect(0, 0, w, h);
        g.setColor(java.awt.Color.WHITE);
        g.setFont(new java.awt.Font("SansSerif", java.awt.Font.BOLD, 92));
        java.awt.FontMetrics fm = g.getFontMetrics();
        int sw = fm.stringWidth(label);
        int x = Math.max(10, (w - sw) / 2);
        int y = h / 2 + fm.getAscent() / 2;
        g.drawString(label, x, y);
        g.dispose();
        ImageIO.write(out, "PNG", new File(thumbnailPath));
    }
}
