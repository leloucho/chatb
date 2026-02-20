package com.aetos.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.url}")
    private String appUrl;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Async
    public void sendVerificationEmail(String toEmail, String token) {
        String subject = "Confirma tu cuenta AETOS";
        String confirmUrl = appUrl + "/verify?token=" + token;
        String message = "Bienvenido a AETOS!\n\n"
                + "Por favor, confirma tu cuenta haciendo clic en el siguiente enlace:\n"
                + confirmUrl + "\n\n"
                + "Este enlace expirará en 24 horas.\n\n"
                + "Bendiciones!";

        SimpleMailMessage email = new SimpleMailMessage();
        email.setFrom(fromEmail);
        email.setTo(toEmail);
        email.setSubject(subject);
        email.setText(message);

        try {
            mailSender.send(email);
        } catch (Exception e) {
            System.err.println("Error al enviar email: " + e.getMessage());
        }
    }

    @Async
    public void sendPasswordResetEmail(String toEmail, String token) {
        String subject = "Restablece tu contraseña - AETOS";
        String resetUrl = appUrl + "/reset-password?token=" + token;
        String message = "Hola,\n\n"
                + "Recibimos una solicitud para restablecer tu contraseña de AETOS.\n\n"
                + "Haz clic en el siguiente enlace para crear una nueva contraseña:\n"
                + resetUrl + "\n\n"
                + "Este enlace expirará en 1 hora.\n\n"
                + "Si no solicitaste este cambio, ignora este correo.\n\n"
                + "Bendiciones!";

        SimpleMailMessage email = new SimpleMailMessage();
        email.setFrom(fromEmail);
        email.setTo(toEmail);
        email.setSubject(subject);
        email.setText(message);

        try {
            mailSender.send(email);
        } catch (Exception e) {
            System.err.println("Error al enviar email de recuperación: " + e.getMessage());
        }
    }

    @Async
    public void sendProgramReminderEmail(String toEmail, String nombreUsuario, String parte, 
                                        String fecha, String hora, String horaFin, 
                                        String lugarNombre, String lugarDireccion) {
        String subject = "🔔 Recordatorio de tu parte en AETOS - " + fecha;
        
        String htmlContent = createProgramReminderHtml(nombreUsuario, parte, fecha, hora, horaFin, 
                                                       lugarNombre, lugarDireccion);

        MimeMessage mimeMessage = mailSender.createMimeMessage();
        
        try {
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            
            mailSender.send(mimeMessage);
            System.out.println("✅ Email enviado exitosamente a " + toEmail);
        } catch (MessagingException e) {
            System.err.println("❌ Error al enviar email de recordatorio: " + e.getMessage());
        }
    }

    private String createProgramReminderHtml(String nombreUsuario, String parte, String fecha, 
                                            String hora, String horaFin, String lugarNombre, 
                                            String lugarDireccion) {
        String parteEmoji = getParteEmoji(parte);
        
        return "<!DOCTYPE html>" +
            "<html>" +
            "<head>" +
            "  <meta charset='UTF-8'>" +
            "  <style>" +
            "    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }" +
            "    .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }" +
            "    .card { background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }" +
            "    .header { text-align: center; margin-bottom: 30px; }" +
            "    .header h1 { color: #4a90e2; margin: 10px 0; font-size: 24px; }" +
            "    .bell-icon { font-size: 48px; }" +
            "    .greeting { font-size: 18px; margin-bottom: 20px; }" +
            "    .parte-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; " +
            "                 padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; font-size: 20px; }" +
            "    .info-section { margin: 25px 0; }" +
            "    .info-item { display: flex; align-items: flex-start; margin: 15px 0; padding: 12px; " +
            "                 background: #f8f9fa; border-radius: 6px; }" +
            "    .info-icon { font-size: 24px; margin-right: 15px; min-width: 30px; }" +
            "    .info-content { flex: 1; }" +
            "    .info-label { font-weight: bold; color: #555; font-size: 14px; }" +
            "    .info-value { color: #333; font-size: 16px; margin-top: 3px; }" +
            "    .footer { text-align: center; margin-top: 30px; padding-top: 20px; " +
            "              border-top: 2px solid #e0e0e0; color: #666; }" +
            "    .footer-message { font-size: 18px; color: #4a90e2; font-weight: bold; }" +
            "    .signature { margin-top: 15px; font-style: italic; color: #888; }" +
            "  </style>" +
            "</head>" +
            "<body>" +
            "  <div class='container'>" +
            "    <div class='card'>" +
            "      <div class='header'>" +
            "        <div class='bell-icon'>🔔</div>" +
            "        <h1>RECORDATORIO AETOS</h1>" +
            "      </div>" +
            "      " +
            "      <div class='greeting'>" +
            "        Hola <strong>" + nombreUsuario + "</strong>," +
            "      </div>" +
            "      " +
            "      <p>Te recordamos que tienes asignada la siguiente parte en el programa:</p>" +
            "      " +
            "      <div class='parte-box'>" +
            "        " + parteEmoji + " " + parte +
            "      </div>" +
            "      " +
            "      <div class='info-section'>" +
            "        <div class='info-item'>" +
            "          <div class='info-icon'>📅</div>" +
            "          <div class='info-content'>" +
            "            <div class='info-label'>FECHA</div>" +
            "            <div class='info-value'>" + fecha + "</div>" +
            "          </div>" +
            "        </div>" +
            "        " +
            "        <div class='info-item'>" +
            "          <div class='info-icon'>🕐</div>" +
            "          <div class='info-content'>" +
            "            <div class='info-label'>HORA</div>" +
            "            <div class='info-value'>" + hora + " - " + horaFin + "</div>" +
            "          </div>" +
            "        </div>" +
            (lugarNombre != null ? 
            "        " +
            "        <div class='info-item'>" +
            "          <div class='info-icon'>📍</div>" +
            "          <div class='info-content'>" +
            "            <div class='info-label'>LUGAR</div>" +
            "            <div class='info-value'>" + lugarNombre + 
            (lugarDireccion != null ? "<br><small style='color: #666;'>" + lugarDireccion + "</small>" : "") +
            "</div>" +
            "          </div>" +
            "        </div>" : "") +
            "      </div>" +
            "      " +
            "      <div class='footer'>" +
            "        <div class='footer-message'>¡Te esperamos! 🙏✨</div>" +
            "        <div class='signature'>Bendiciones del equipo AETOS</div>" +
            "      </div>" +
            "    </div>" +
            "  </div>" +
            "</body>" +
            "</html>";
    }

    private String getParteEmoji(String parte) {
        if (parte.toLowerCase().contains("confraternización")) return "🎉";
        if (parte.toLowerCase().contains("dinámica")) return "🎮";
        if (parte.toLowerCase().contains("especial")) return "⭐";
        if (parte.toLowerCase().contains("oración")) return "🙏";
        if (parte.toLowerCase().contains("tema")) return "📖";
        return "📋";
    }
}
