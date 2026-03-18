package com.sistema.cadastro.controller;

import com.sistema.cadastro.dto.AdminCreateUserRequest;
import com.sistema.cadastro.dto.LoginRequest;
import com.sistema.cadastro.dto.LoginResponse;
import com.sistema.cadastro.dto.RegisterRequest;
import com.sistema.cadastro.dto.UpdateUserRequest;
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
    @PreAuthorize("hasRole('ADM')")
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
    @PreAuthorize("hasRole('ADM')")
    public ResponseEntity<?> createUserAdmin(@Valid @RequestBody AdminCreateUserRequest request) {
        try {
            Usuario u = usuarioService.createByAdmin(request);
            u.setPassword(null);
            return ResponseEntity.status(HttpStatus.CREATED).body(u);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADM')")
    public ResponseEntity<List<Usuario>> getAllUsers() {
        return ResponseEntity.ok(usuarioService.findAll());
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('ADM')")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        try {
            usuarioService.delete(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/users/{id}")
    @PreAuthorize("hasRole('ADM')")
    public ResponseEntity<Usuario> updateUser(@PathVariable Long id, @RequestBody UpdateUserRequest request) {
        Usuario updatedUser = usuarioService.update(id, request);
        if (updatedUser == null) {
            return ResponseEntity.notFound().build();
        }
        updatedUser.setPassword(null);
        return ResponseEntity.ok(updatedUser);
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

