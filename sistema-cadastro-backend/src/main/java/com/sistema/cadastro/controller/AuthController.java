package com.sistema.cadastro.controller;

import com.sistema.cadastro.dto.LoginRequest;
import com.sistema.cadastro.dto.LoginResponse;
import com.sistema.cadastro.dto.RegisterRequest;
import com.sistema.cadastro.dto.UpdateUserRequest;
import com.sistema.cadastro.model.Usuario;
import com.sistema.cadastro.service.UsuarioService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UsuarioService usuarioService;

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

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADM')")
    public ResponseEntity<List<Usuario>> getAllUsers() {
        return ResponseEntity.ok(usuarioService.findAll());
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('ADM')")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        usuarioService.delete(id);
        return ResponseEntity.noContent().build();
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
        Usuario user = usuarioService.findByUsername(
            org.springframework.security.core.context.SecurityContextHolder.getContext()
                .getAuthentication().getName()
        ).orElse(null);
        
        if (user != null) {
            user.setPassword(null);
        }
        return ResponseEntity.ok(user);
    }
}

