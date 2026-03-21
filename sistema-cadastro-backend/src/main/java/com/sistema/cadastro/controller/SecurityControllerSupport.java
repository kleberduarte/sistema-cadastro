package com.sistema.cadastro.controller;

import com.sistema.cadastro.model.Usuario;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;

public final class SecurityControllerSupport {

    private SecurityControllerSupport() {}

    public static Usuario requireUsuario(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof Usuario u)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        return u;
    }
}
