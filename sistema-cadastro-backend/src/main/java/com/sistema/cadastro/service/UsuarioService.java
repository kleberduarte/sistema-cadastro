package com.sistema.cadastro.service;

import com.sistema.cadastro.dto.AdminCreateUserRequest;
import com.sistema.cadastro.dto.LoginRequest;
import com.sistema.cadastro.dto.LoginResponse;
import com.sistema.cadastro.dto.RegisterRequest;
import com.sistema.cadastro.dto.UpdateUserRequest;
import com.sistema.cadastro.model.Role;
import com.sistema.cadastro.model.Usuario;
import com.sistema.cadastro.repository.UsuarioRepository;
import com.sistema.cadastro.repository.VendaRepository;
import com.sistema.cadastro.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final ClienteService clienteService;
    private final VendaRepository vendaRepository;

    @Value("${app.pdv.empresa-padrao-id:1}")
    private long empresaPadraoPdvId;

    public long resolveEmpresaPdvId(Usuario user) {
        if (user != null && user.getEmpresaId() != null && user.getEmpresaId() >= 1) {
            return user.getEmpresaId();
        }
        return empresaPadraoPdvId;
    }

    /** ID de empresa usado quando o usuário não tem empresa PDV definida (application.properties). */
    public long getEmpresaPadraoPdvId() {
        return empresaPadraoPdvId;
    }

    public LoginResponse login(LoginRequest request) {
        Optional<Usuario> userOpt = usuarioRepository.findByUsername(request.getUsername());
        
        if (userOpt.isEmpty()) {
            return new LoginResponse(null, null, null, null, "Usuário não encontrado", null);
        }
        
        Usuario user = userOpt.get();
        
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return new LoginResponse(null, null, null, null, "Senha incorreta", null);
        }
        
        String token = jwtUtil.generateToken(user.getUsername(), user.getRole().name());
        Long eid = resolveEmpresaPdvId(user);
        return new LoginResponse(token, user.getId(), user.getUsername(), user.getRole(), "Login realizado com sucesso", eid);
    }

    /**
     * Cadastro público (tela login): exige ID da empresa (cliente) e código de convite válido.
     * Sempre cria perfil VENDEDOR.
     */
    @Transactional
    public LoginResponse register(RegisterRequest request) {
        if (usuarioRepository.findByUsername(request.getUsername()).isPresent()) {
            return new LoginResponse(null, null, null, null, "Usuário já existe", null);
        }
        Long empresaId = request.getEmpresaId();
        if (empresaId == null || empresaId < 1) {
            return new LoginResponse(null, null, null, null,
                    "Informe o ID da empresa e o código de convite fornecido pelo administrador.", null);
        }
        if (!clienteService.validarCodigoConvite(empresaId, request.getCodigoConvite())) {
            return new LoginResponse(null, null, null, null,
                    "Código de convite inválido ou empresa sem código ativo. Solicite um novo código ao administrador.", null);
        }

        Usuario newUser = new Usuario();
        newUser.setUsername(request.getUsername());
        newUser.setPassword(passwordEncoder.encode(request.getPassword()));
        newUser.setRole(Role.VENDEDOR);
        newUser.setEmpresaId(empresaId);
        newUser.setTelefone(null);

        usuarioRepository.save(newUser);

        // Convite foi usado com sucesso: consumir/excluir para impedir reutilização
        try {
            clienteService.consumirCodigoConvitePdv(empresaId);
        } catch (Exception ignored) {
            // Se o consumo falhar, ainda assim o usuário foi criado; o próximo fluxo tenta validar novamente com outro código
        }

        String token = jwtUtil.generateToken(newUser.getUsername(), newUser.getRole().name());
        Long eid = resolveEmpresaPdvId(newUser);
        return new LoginResponse(token, newUser.getId(), newUser.getUsername(), newUser.getRole(),
                "Usuário cadastrado com sucesso", eid);
    }

    /** Cadastro pelo administrador (retaguarda), sem código de convite. */
    public Usuario createByAdmin(AdminCreateUserRequest request) {
        if (usuarioRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new IllegalArgumentException("Usuário já existe");
        }
        Usuario u = new Usuario();
        u.setUsername(request.getUsername().trim());
        u.setPassword(passwordEncoder.encode(request.getPassword()));
        u.setRole(request.getRole() != null ? request.getRole() : Role.VENDEDOR);
        u.setEmpresaId(request.getEmpresaId() != null && request.getEmpresaId() >= 1 ? request.getEmpresaId() : null);
        if (request.getTelefone() != null) {
            String t = request.getTelefone().trim();
            u.setTelefone(t.isEmpty() ? null : t);
        }
        return usuarioRepository.save(u);
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

    @Transactional
    public void delete(Long id) {
        if (!usuarioRepository.existsById(id)) {
            throw new IllegalArgumentException("Usuário não encontrado");
        }
        if (usuarioRepository.count() <= 1) {
            throw new IllegalStateException("Não é possível excluir o único usuário do sistema.");
        }
        if (vendaRepository.countByUsuario_Id(id) > 0) {
            Usuario outro = usuarioRepository.findAll().stream()
                    .filter(u -> !u.getId().equals(id))
                    .min(Comparator
                            .comparing((Usuario u) -> u.getRole() == Role.ADM ? 0 : 1)
                            .thenComparing(Usuario::getId))
                    .orElseThrow(() -> new IllegalStateException("Nenhum outro usuário para manter o histórico de vendas."));
            vendaRepository.reatribuirVendasAoUsuario(id, outro.getId());
        }
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

        if (Boolean.TRUE.equals(request.getAplicarEmpresaPdv())) {
            Long e = request.getEmpresaIdPdv();
            user.setEmpresaId(e != null && e >= 1 ? e : null);
        }

        if (Boolean.TRUE.equals(request.getDesvincularPdv())) {
            user.setPdvTerminalId(null);
        }

        if (Boolean.TRUE.equals(request.getAplicarTelefone())) {
            if (request.getTelefone() == null || request.getTelefone().isBlank()) {
                user.setTelefone(null);
            } else {
                user.setTelefone(request.getTelefone().trim());
            }
        }

        return usuarioRepository.save(user);
    }

    private Usuario toDto(Usuario usuario) {
        usuario.setPassword(null);
        return usuario;
    }
}

