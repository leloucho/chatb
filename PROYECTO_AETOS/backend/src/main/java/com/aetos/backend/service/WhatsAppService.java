package com.aetos.backend.service;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class WhatsAppService {
    
    @Value("${twilio.account.sid}")
    private String accountSid;
    
    @Value("${twilio.auth.token}")
    private String authToken;
    
    @Value("${twilio.whatsapp.from}")
    private String fromNumber;
    
    private boolean initialized = false;
    
    private void initialize() {
        if (!initialized && accountSid != null && !accountSid.startsWith("YOUR_")) {
            Twilio.init(accountSid, authToken);
            initialized = true;
        }
    }
    
    public boolean sendWhatsAppMessage(String toNumber, String messageBody) {
        try {
            // Validar configuración
            if (accountSid == null || accountSid.startsWith("YOUR_")) {
                System.out.println("⚠️ Twilio no configurado. Configure las credenciales en application.properties");
                return false;
            }
            
            initialize();
            
            // Formatear número (debe tener formato internacional)
            String formattedNumber = formatPhoneNumber(toNumber);
            
            System.out.println("📱 Enviando WhatsApp a: " + formattedNumber);
            System.out.println("📝 Mensaje: " + messageBody);
            
            Message message = Message.creator(
                new PhoneNumber("whatsapp:" + formattedNumber),
                new PhoneNumber(fromNumber),
                messageBody
            ).create();
            
            System.out.println("✅ WhatsApp enviado. SID: " + message.getSid());
            return true;
            
        } catch (Exception e) {
            System.err.println("❌ Error enviando WhatsApp: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }
    
    private String formatPhoneNumber(String phoneNumber) {
        // Limpiar el número
        String cleaned = phoneNumber.replaceAll("[^0-9+]", "");
        
        // Si no empieza con +, asumimos que es de Perú (+51)
        if (!cleaned.startsWith("+")) {
            // Si empieza con 51, agregar +
            if (cleaned.startsWith("51")) {
                cleaned = "+" + cleaned;
            } else {
                // Agregar código de país de Perú
                cleaned = "+51" + cleaned;
            }
        }
        
        return cleaned;
    }
}
