package com.manaforge.api.service;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.UserRepository;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    @Autowired
    private UserRepository userRepository;

    @Value("${services.frontend.url}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        
        // 1. Extraer datos de Google
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");

        // 2. LÓGICA DE NEGOCIO (Ejemplo):
        boolean isNewUser = userRepository.findByEmail(email).isEmpty();
        if (isNewUser) {
            // Usar el nombre de pila de Google como username; si no viene, usar la parte local del email
            String givenName = oAuth2User.getAttribute("given_name");
            String defaultUsername = (givenName != null && !givenName.isBlank())
                ? givenName
                : email.split("@")[0];

            User newUser = new User();
            newUser.setEmail(email);
            newUser.setUsername(defaultUsername);
            newUser.setName(name);
            newUser.setActive(true);
            newUser.setPassword(""); // Sin password
            newUser.setValidated(true);
            newUser.setBetaAccepted(false);
            newUser.setFriends(new String[0]);
            newUser.setBiography("");
            userRepository.save(newUser);
        }
        
        System.out.println("Usuario logueado con Google: " + email);

        // 3. Redirección final — nuevos usuarios ven el modal de bienvenida beta
        String redirect = isNewUser ? frontendUrl + "/profile?beta_welcome=true" : frontendUrl + "/profile";
        response.sendRedirect(redirect);
    }
}
