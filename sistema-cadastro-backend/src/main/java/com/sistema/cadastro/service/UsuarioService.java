package com.sistema.cadastro.service;

import com.sistema.cadastro.dto.LoginRequest;
import com.sistema.cadastro.dto.LoginResponse;
import com.sistema.cadastro.dto.RegisterRequest;
import com.sistema.cadastro.dto.UpdateUserRequest;
import com.sistema.cadastro.model.Role;
import com.sistema.cadastro.model.Usuario;
import com.sistema.cadastro.repository.UsuarioRepository;
import com.sistema.cadastro.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public LoginResponse login(LoginRequest request) {
        Optional<Usuario> userOpt = usuarioRepository.findByUsername(request.getUsername());
        
        if (userOpt.isEmpty()) {
            return new LoginResponse(null, null, null, null, "Usuário não encontrado");
        }
        
        Usuario user = userOpt.get();
        
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return new LoginResponse(null, null, null, null, "Senha incorreta");
        }
        
        String token = jwtUtil.generateToken(user.getUsername(), user.getRole().name());
        return new LoginResponse(token, user.getId(), user.getUsername(), user.getRole(), "Login realizado com sucesso");
    }

    public LoginResponse register(RegisterRequest request) {
        if (usuarioRepository.findByUsername(request.getUsername()).isPresent()) {
            return new LoginResponse(null, null, null, null, "Usuário já existe");
        }
        
        Usuario newUser = new Usuario();
        newUser.setUsername(request.getUsername());
        newUser.setPassword(passwordEncoder.encode(request.getPassword()));
        newUser.setRole(request.getRole() != null ? request.getRole() : Role.VENDEDOR);
        
        usuarioRepository.save(newUser);
        
        String token = jwtUtil.generateToken(newUser.getUsername(), newUser.getRole().name());
        return new LoginResponse(token, newUser.getId(), newUser.getUsername(), newUser.getRole(), "Usuário cadastrado com sucesso");
    }

    public List<Usuario> findAll() {
        return usuarioRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public Optional<Usuario> findById(Long id) {
        return usuarioRepository.findById(id);
    }

    public Optional<Usuario> findByUsername(String username) {
        return usuarioRepository.findByUsername(username);
    }

    public void delete(Long id) {
        usuarioRepository.deleteById(id);
    }

    public Usuario update(Long id, UpdateUserRequest request) {
        Optional<Usuario> userOpt = usuarioRepository.findById(id);
        
        if (userOpt.isEmpty()) {
            return null;
        }
        
        Usuario user = userOpt.get();
        
        // Atualizar username
        user.setUsername(request.getUsername());
        
        // Atualizar role se fornecida
        if (request.getRole() != null) {
            user.setRole(request.getRole());
        }
        
        // Atualizar senha se fornecida
        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }
        
        return usuarioRepository.save(user);
    }

    private Usuario toDto(Usuario usuario) {
        usuario.setPassword(null);
        return usuario;
    }
}

