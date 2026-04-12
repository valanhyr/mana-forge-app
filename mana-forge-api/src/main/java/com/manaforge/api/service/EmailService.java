package com.manaforge.api.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.manaforge.api.dto.ContactRequest;
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

    @Value("${mail.admin}")
    private String adminAddress;

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

    // ── Contact form ──────────────────────────────────────────────────────────

    @Async
    public void sendContactConfirmation(ContactRequest req) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(req.getEmail());
            helper.setSubject("Hemos recibido tu mensaje — ManaForge");
            helper.setText(buildContactConfirmationHtml(req), true);
            mailSender.send(message);
            log.info("Contact confirmation sent to {}", req.getEmail());
        } catch (Exception e) {
            log.error("Failed to send contact confirmation to {}: {}", req.getEmail(), e.getMessage());
        }
    }

    @Async
    public void sendContactNotification(ContactRequest req) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(adminAddress);
            helper.setSubject("[ManaForge Contact] " + req.getSubject() + " — " + req.getName());
            helper.setText(buildContactNotificationHtml(req), true);
            mailSender.send(message);
            log.info("Contact notification sent to admin for {}", req.getEmail());
        } catch (Exception e) {
            log.error("Failed to send contact notification: {}", e.getMessage());
        }
    }

    private String buildContactConfirmationHtml(ContactRequest req) {
        return """
            <!DOCTYPE html>
            <html lang="es">
            <head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
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
                        <h1 style="color:#fff;font-size:22px;margin:0 0 12px;">¡Gracias, %s!</h1>
                        <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 24px;">
                          Hemos recibido tu mensaje correctamente.<br/>
                          Te responderemos lo antes posible en esta misma dirección de correo.
                        </p>
                        <table width="100%%" cellpadding="0" cellspacing="0"
                               style="background:#09090b;border-radius:8px;border:1px solid #3f3f46;margin-bottom:24px;">
                          <tr><td style="padding:16px 20px;">
                            <p style="color:#71717a;font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:.05em;">Asunto</p>
                            <p style="color:#e4e4e7;font-size:14px;margin:0;">%s</p>
                          </td></tr>
                          <tr><td style="padding:0 20px 16px;">
                            <p style="color:#71717a;font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:.05em;">Mensaje</p>
                            <p style="color:#a1a1aa;font-size:14px;margin:0;line-height:1.6;white-space:pre-wrap;">%s</p>
                          </td></tr>
                        </table>
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
            """.formatted(req.getName(), req.getSubject(), req.getMessage(),
                          java.time.Year.now().getValue(), frontendUrl);
    }

    private String buildContactNotificationHtml(ContactRequest req) {
        return """
            <!DOCTYPE html>
            <html lang="es">
            <head><meta charset="UTF-8"/></head>
            <body style="margin:0;padding:0;background:#09090b;font-family:sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 0;">
                <tr><td align="center">
                  <table width="560" cellpadding="0" cellspacing="0" style="background:#18181b;border-radius:12px;overflow:hidden;border:1px solid #3f3f46;">
                    <tr>
                      <td style="background:#1d4ed8;padding:20px 32px;text-align:center;">
                        <span style="font-size:16px;font-weight:700;color:#fff;">📬 Nuevo mensaje de contacto</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:28px 32px;">
                        <table width="100%%" cellpadding="0" cellspacing="0"
                               style="background:#09090b;border-radius:8px;border:1px solid #3f3f46;">
                          <tr>
                            <td style="padding:14px 20px;border-bottom:1px solid #3f3f46;">
                              <span style="color:#71717a;font-size:12px;">Nombre</span><br/>
                              <span style="color:#e4e4e7;font-size:15px;font-weight:600;">%s</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:14px 20px;border-bottom:1px solid #3f3f46;">
                              <span style="color:#71717a;font-size:12px;">Email</span><br/>
                              <a href="mailto:%s" style="color:#f97316;font-size:15px;text-decoration:none;">%s</a>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:14px 20px;border-bottom:1px solid #3f3f46;">
                              <span style="color:#71717a;font-size:12px;">Asunto</span><br/>
                              <span style="color:#e4e4e7;font-size:15px;">%s</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:14px 20px;">
                              <span style="color:#71717a;font-size:12px;">Mensaje</span><br/>
                              <span style="color:#a1a1aa;font-size:14px;line-height:1.7;white-space:pre-wrap;">%s</span>
                            </td>
                          </tr>
                        </table>
                        <p style="margin:20px 0 0;text-align:center;">
                          <a href="mailto:%s?subject=Re: %s"
                             style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:700;font-size:14px;">
                            Responder →
                          </a>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """.formatted(req.getName(), req.getEmail(), req.getEmail(),
                          req.getSubject(), req.getMessage(),
                          req.getEmail(), req.getSubject());
    }
}
