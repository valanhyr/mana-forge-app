package com.manaforge.api.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.manaforge.api.model.mongo.User;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${mail.from}")
    private String fromAddress;

    @Value("${services.frontend.url}")
    private String frontendUrl;

    @Async
    public void sendVerificationEmail(User user) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress);
            helper.setTo(user.getEmail());
            helper.setSubject("Confirma tu cuenta en ManaForge");
            helper.setText(buildVerificationHtml(user), true);

            mailSender.send(message);
            log.info("Verification email sent to {}", user.getEmail());
        } catch (Exception e) {
            log.error("Failed to send verification email to {}: {}", user.getEmail(), e.getMessage());
        }
    }

    private String buildVerificationHtml(User user) {
        String verifyUrl = frontendUrl + "/verify-email?token=" + user.getVerificationToken();        return """
            <!DOCTYPE html>
            <html lang="es">
            <head>
              <meta charset="UTF-8"/>
              <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
            </head>
            <body style="margin:0;padding:0;background:#09090b;font-family:sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 0;">
                <tr><td align="center">
                  <table width="560" cellpadding="0" cellspacing="0" style="background:#18181b;border-radius:12px;overflow:hidden;border:1px solid #3f3f46;">
                    <tr>
                      <td style="background:#c2410c;padding:24px 32px;text-align:center;">
                        <span style="font-size:24px;font-weight:900;color:#fff;letter-spacing:-1px;">
                          MANA<span style="color:#fed7aa;">FORGE</span>
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:32px;">
                        <h1 style="color:#fff;font-size:22px;margin:0 0 12px;">Confirma tu cuenta, %s</h1>
                        <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 24px;">
                          Haz clic en el botón para verificar tu dirección de correo y activar tu cuenta.
                        </p>
                        <a href="%s"
                           style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:15px;">
                          Verificar mi cuenta →
                        </a>
                        <p style="color:#52525b;font-size:13px;margin:24px 0 0;">
                          Si no creaste esta cuenta, ignora este correo.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:20px 32px;border-top:1px solid #3f3f46;text-align:center;">
                        <p style="color:#52525b;font-size:12px;margin:0;">
                          © %d ManaForge · <a href="%s" style="color:#f97316;text-decoration:none;">manaforge.app</a>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """.formatted(user.getName(), verifyUrl, java.time.Year.now().getValue(), frontendUrl);
    }

    @Async
    public void sendWelcomeEmail(User user) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress);
            helper.setTo(user.getEmail());
            helper.setSubject("¡Bienvenido a ManaForge, " + user.getName() + "!");
            helper.setText(buildWelcomeHtml(user), true);

            mailSender.send(message);
            log.info("Welcome email sent to {}", user.getEmail());
        } catch (Exception e) {
            log.error("Failed to send welcome email to {}: {}", user.getEmail(), e.getMessage());
        }
    }

    private String buildWelcomeHtml(User user) {
        return """
            <!DOCTYPE html>
            <html lang="es">
            <head>
              <meta charset="UTF-8"/>
              <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
            </head>
            <body style="margin:0;padding:0;background:#09090b;font-family:sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 0;">
                <tr><td align="center">
                  <table width="560" cellpadding="0" cellspacing="0" style="background:#18181b;border-radius:12px;overflow:hidden;border:1px solid #3f3f46;">
                    <!-- Header -->
                    <tr>
                      <td style="background:#c2410c;padding:24px 32px;text-align:center;">
                        <span style="font-size:24px;font-weight:900;color:#fff;letter-spacing:-1px;">
                          MANA<span style="color:#fed7aa;">FORGE</span>
                        </span>
                      </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                      <td style="padding:32px;">
                        <h1 style="color:#fff;font-size:22px;margin:0 0 12px;">¡Bienvenido, %s!</h1>
                        <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 24px;">
                          Tu cuenta en ManaForge ha sido creada correctamente.<br/>
                          Ya puedes construir y analizar mazos para el formato <strong style="color:#f97316;">Premodern</strong>.
                        </p>
                        <a href="%s/deck-builder"
                           style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:15px;">
                          Ir al Deck Builder →
                        </a>
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style="padding:20px 32px;border-top:1px solid #3f3f46;text-align:center;">
                        <p style="color:#52525b;font-size:12px;margin:0;">
                          © %d ManaForge · <a href="%s" style="color:#f97316;text-decoration:none;">manaforge.app</a>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """.formatted(
                user.getName(),
                frontendUrl,
                java.time.Year.now().getValue(),
                frontendUrl
            );
    }
}
