package com.aetos.backend.service;

import com.aetos.backend.model.Notification;
import com.aetos.backend.model.ProgramWeekly;
import com.aetos.backend.model.User;
import com.aetos.backend.repository.NotificationRepository;
import com.aetos.backend.repository.ProgramWeeklyRepository;
import com.aetos.backend.repository.UserRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class NotificationScheduler {
    
    private final ProgramWeeklyRepository programRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final EmailService emailService;
    
    public NotificationScheduler(
            ProgramWeeklyRepository programRepository,
            UserRepository userRepository,
            NotificationRepository notificationRepository,
            EmailService emailService) {
        this.programRepository = programRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.emailService = emailService;
    }
    
    // Ejecutar cada 30 minutos
    @Scheduled(fixedRate = 1800000) // 30 minutos en milisegundos
    public void checkAndSendProgramReminders() {
        System.out.println("🔔 Verificando programas para enviar recordatorios...");
        
        LocalDateTime now = LocalDateTime.now();
        LocalDate twoDaysLater = now.toLocalDate().plusDays(2);
        LocalTime currentTime = now.toLocalTime();
        
        System.out.println("⏰ Hora actual: " + now);
        System.out.println("📅 Buscando programas para: " + twoDaysLater);
        
        // Obtener todos los programas
        List<ProgramWeekly> allPrograms = programRepository.findAll();
        
        for (ProgramWeekly program : allPrograms) {
            // Verificar si el programa es en 2 días
            if (!program.getWeekStart().equals(twoDaysLater)) {
                continue;
            }
            
            // Parsear hora del programa
            String[] timeParts = program.getHora().split(":");
            int programHour = Integer.parseInt(timeParts[0]);
            int programMinute = Integer.parseInt(timeParts[1]);
            LocalTime programTime = LocalTime.of(programHour, programMinute);
            
            // Verificar si la hora coincide (con margen de 30 minutos)
            long minutesDiff = Math.abs(java.time.Duration.between(currentTime, programTime).toMinutes());
            
            if (minutesDiff > 30) {
                continue; // No es el momento de enviar notificación para este programa
            }
            
            System.out.println("📋 Programa encontrado: " + program.getWeekStart() + " " + program.getHora());
            
            // Recopilar todos los responsables
            Set<String> responsables = new HashSet<>();
            if (program.getResponsableConfraternizacion() != null && !program.getResponsableConfraternizacion().isEmpty()) {
                responsables.add(program.getResponsableConfraternizacion());
            }
            if (program.getResponsableDinamica() != null && !program.getResponsableDinamica().isEmpty()) {
                responsables.add(program.getResponsableDinamica());
            }
            if (program.getResponsableEspecial() != null && !program.getResponsableEspecial().isEmpty()) {
                responsables.add(program.getResponsableEspecial());
            }
            if (program.getResponsableOracionIntercesora() != null && !program.getResponsableOracionIntercesora().isEmpty()) {
                responsables.add(program.getResponsableOracionIntercesora());
            }
            if (program.getResponsableTema() != null && !program.getResponsableTema().isEmpty()) {
                responsables.add(program.getResponsableTema());
            }
            
            if (responsables.isEmpty()) {
                System.out.println("⚠️ No hay responsables asignados");
                continue;
            }
            
            System.out.println("👥 Responsables: " + responsables);
            
            // Enviar notificación a cada responsable
            for (String nombreResponsable : responsables) {
                sendReminderToResponsible(program, nombreResponsable);
            }
        }
    }
    
    private void sendReminderToResponsible(ProgramWeekly program, String nombreResponsable) {
        // Buscar usuario por nombre o email
        List<User> users = userRepository.findAll().stream()
            .filter(u -> {
                String fullName = u.getNombre() + " " + u.getApellidos();
                return fullName.trim().equalsIgnoreCase(nombreResponsable.trim()) ||
                       u.getNombre().trim().equalsIgnoreCase(nombreResponsable.trim()) ||
                       (u.getEmail() != null && u.getEmail().trim().equalsIgnoreCase(nombreResponsable.trim()));
            })
            .toList();
        
        if (users.isEmpty()) {
            System.out.println("⚠️ Usuario no encontrado: " + nombreResponsable);
            return;
        }
        
        User user = users.get(0);
        System.out.println("✅ Usuario encontrado: " + user.getNombre() + " (" + user.getEmail() + ")");
        
        // Verificar si ya se envió notificación para este programa y usuario
        List<Notification> existingNotifications = notificationRepository.findAll().stream()
            .filter(n -> n.getUserId().equals(user.getId()) && 
                        n.getMessage().contains(program.getWeekStart().toString()) &&
                        n.getMessage().contains(program.getHora()))
            .toList();
        
        if (!existingNotifications.isEmpty()) {
            System.out.println("ℹ️ Notificación ya enviada a " + nombreResponsable);
            return;
        }
        
        // Determinar qué parte tiene asignada
        String parte = determinarParte(program, nombreResponsable);
        
        // Formatear fecha en español
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("EEEE, d 'de' MMMM", new Locale("es", "PE"));
        String fechaFormateada = program.getWeekStart().format(dateFormatter);
        
        // Enviar Email
        boolean sent = false;
        if (user.getEmail() != null && !user.getEmail().isEmpty()) {
            String lugarNombre = program.getLocation() != null ? program.getLocation().getName() : null;
            String lugarDireccion = program.getLocation() != null ? program.getLocation().getAddress() : null;
            
            emailService.sendProgramReminderEmail(
                user.getEmail(),
                nombreResponsable,
                parte,
                fechaFormateada,
                program.getHora(),
                program.getHoraFin(),
                lugarNombre,
                lugarDireccion
            );
            sent = true;
            System.out.println("📧 Email enviado a " + user.getEmail());
        } else {
            System.out.println("⚠️ Usuario " + nombreResponsable + " no tiene email registrado");
        }
        
        // Crear mensaje para la notificación en el sistema
        String mensaje = crearMensajeRecordatorio(program, nombreResponsable, parte);
        
        // Guardar notificación en la base de datos
        Notification notification = Notification.builder()
            .userId(user.getId())
            .message(mensaje)
            .read(false)
            .createdAt(LocalDateTime.now())
            .type(sent ? "email" : "system")
            .build();
        
        notificationRepository.save(notification);
        
        System.out.println("✅ Notificación creada para " + nombreResponsable);
    }
    
    private String determinarParte(ProgramWeekly program, String nombreResponsable) {
        if (nombreResponsable.equalsIgnoreCase(program.getResponsableConfraternizacion())) {
            return "Confraternización 🎉";
        }
        if (nombreResponsable.equalsIgnoreCase(program.getResponsableDinamica())) {
            return "Dinámica 🎮";
        }
        if (nombreResponsable.equalsIgnoreCase(program.getResponsableEspecial())) {
            return "Especial ⭐";
        }
        if (nombreResponsable.equalsIgnoreCase(program.getResponsableOracionIntercesora())) {
            return "Oración Intercesora 🙏";
        }
        if (nombreResponsable.equalsIgnoreCase(program.getResponsableTema())) {
            return "Tema 📖";
        }
        return "Parte asignada";
    }
    
    private String crearMensajeRecordatorio(ProgramWeekly program, String nombreResponsable, String parte) {
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("EEEE, d 'de' MMMM", new Locale("es", "PE"));
        String fechaFormateada = program.getWeekStart().format(dateFormatter);
        
        StringBuilder mensaje = new StringBuilder();
        mensaje.append("🔔 *RECORDATORIO AETOS* 🔔\n\n");
        mensaje.append("Hola *").append(nombreResponsable).append("*,\n\n");
        mensaje.append("Te recordamos que tienes asignada la parte de *").append(parte).append("*\n\n");
        mensaje.append("📅 *Fecha:* ").append(fechaFormateada).append("\n");
        mensaje.append("🕐 *Hora:* ").append(program.getHora()).append(" - ").append(program.getHoraFin()).append("\n");
        
        if (program.getLocation() != null) {
            mensaje.append("📍 *Lugar:* ").append(program.getLocation().getName()).append("\n");
            if (program.getLocation().getAddress() != null) {
                mensaje.append("   ").append(program.getLocation().getAddress()).append("\n");
            }
        }
        
        mensaje.append("\n¡Te esperamos! 🙏✨");
        
        return mensaje.toString();
    }
}
