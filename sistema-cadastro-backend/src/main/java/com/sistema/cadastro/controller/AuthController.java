package com.sistema.cadastro.controller;

import com.sistema.cadastro.dto.AdminCreateUserRequest;
import com.sistema.cadastro.dto.AdminCreateUserResponse;
import com.sistema.cadastro.dto.LoginRequest;
import com.sistema.cadastro.dto.TrocarSenhaPrimeiroAcessoRequest;
import com.sistema.cadastro.dto.LoginResponse;
import com.sistema.cadastro.dto.RegisterRequest;
import com.sistema.cadastro.dto.UpdateUserRequest;
import com.sistema.cadastro.model.Role;
import com.sistema.cadastro.model.Usuario;
import com.sistema.cadastro.service.UsuarioService;
import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UsuarioService usuarioService;

    @GetMapping("/pdv-empresa-padrao")
    @PreAuthorize("hasAnyRole('ADM','ADMIN_EMPRESA')")
    public Map<String, Long> pdvEmpresaPadrao() {
        return Map.of("empresaId", usuarioService.getEmpresaPadraoPdvId());
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        LoginResponse response = usuarioService.login(request);
        if (response.getToken() == null) {
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/register")
    public ResponseEntity<LoginResponse> register(@RequestBody RegisterRequest request) {
        LoginResponse response = usuarioService.register(request);
        if (response.getToken() == null) {
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/users")
    @PreAuthorize("hasAnyRole('ADM','ADMIN_EMPRESA')")
    public ResponseEntity<?> createUserAdmin(@Valid @RequestBody AdminCreateUserRequest request, Authentication auth) {
        try {
            Usuario requester = auth != null && auth.getPrincipal() instanceof Usuario u ? u : null;
            AdminCreateUserResponse body = usuarioService.createByAdmin(request, requester);
            return ResponseEntity.status(HttpStatus.CREATED).body(body);
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    /**
     * Troca de senha no 1º acesso (contas com senha provisória gerada pelo ADM).
     * Exige JWT do login com a senha provisória.
     */
    @PostMapping("/trocar-senha-primeiro-acesso")
    public ResponseEntity<?> trocarSenhaPrimeiroAcesso(
            @Valid @RequestBody TrocarSenhaPrimeiroAcessoRequest body,
            Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String username;
        Object principal = auth.getPrincipal();
        if (principal instanceof Usuario u) {
            username = u.getUsername();
        } else {
            username = auth.getName();
        }
        try {
            usuarioService.trocarSenhaPrimeiroAcesso(username, body.getSenhaAtual(), body.getNovaSenha());
            return ResponseEntity.ok(Map.of("message", "Senha alterada com sucesso"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/users")
    @PreAuthorize("hasAnyRole('ADM','ADMIN_EMPRESA')")
    public ResponseEntity<List<Usuario>> getAllUsers(Authentication auth) {
        Usuario requester = auth != null && auth.getPrincipal() instanceof Usuario u ? u : null;
        if (requester != null && requester.getRole() == Role.ADMIN_EMPRESA) {
            return ResponseEntity.ok(usuarioService.findAllByEmpresa(requester.getEmpresaId()));
        }
        return ResponseEntity.ok(usuarioService.findAll());
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasAnyRole('ADM','ADMIN_EMPRESA')")
    public ResponseEntity<?> deleteUser(@PathVariable Long id, Authentication auth) {
        try {
            Usuario requester = auth != null && auth.getPrincipal() instanceof Usuario u ? u : null;
            usuarioService.delete(id, requester);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/users/{id}")
    @PreAuthorize("hasAnyRole('ADM','ADMIN_EMPRESA')")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody UpdateUserRequest request, Authentication auth) {
        try {
            Usuario requester = auth != null && auth.getPrincipal() instanceof Usuario u ? u : null;
            Usuario updatedUser = usuarioService.update(id, request, requester);
            if (updatedUser == null) {
                return ResponseEntity.notFound().build();
            }
            updatedUser.setPassword(null);
            return ResponseEntity.ok(updatedUser);
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<Usuario> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            return ResponseEntity.status(401).build();
        }
        // JWT filter usa Usuario como principal; getName() seria toString(), não o login
        Object principal = auth.getPrincipal();
        Usuario user = null;
        if (principal instanceof Usuario u) {
            user = u;
        } else if (principal instanceof String username) {
            user = usuarioService.findByUsername(username).orElse(null);
        } else {
            user = usuarioService.findByUsername(auth.getName()).orElse(null);
        }
        if (user != null) {
            user.setPassword(null);
            return ResponseEntity.ok(user);
        }
        return ResponseEntity.status(401).build();
    }
}

