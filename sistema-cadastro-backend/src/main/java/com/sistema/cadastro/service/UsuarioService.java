package com.sistema.cadastro.service;

import com.sistema.cadastro.dto.AdminCreateUserRequest;
import com.sistema.cadastro.dto.AdminCreateUserResponse;
import com.sistema.cadastro.dto.LoginRequest;
import com.sistema.cadastro.dto.LoginResponse;
import com.sistema.cadastro.dto.RegisterRequest;
import com.sistema.cadastro.dto.UpdateUserRequest;
import com.sistema.cadastro.model.Role;
import com.sistema.cadastro.model.Usuario;
import com.sistema.cadastro.repository.FechamentoCaixaRepository;
import com.sistema.cadastro.repository.UsuarioRepository;
import com.sistema.cadastro.repository.VendaRepository;
import com.sistema.cadastro.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
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
    private final FechamentoCaixaRepository fechamentoCaixaRepository;

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
        Optional<Usuario> userOpt = usuarioRepository.findByUsernameLenient(request.getUsername());
        
        if (userOpt.isEmpty()) {
            return new LoginResponse(null, null, null, null, "Usuário não encontrado", null, null);
        }
        
        Usuario user = userOpt.get();
        
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return new LoginResponse(null, null, null, null, "Senha incorreta", null, null);
        }
        
        String token = jwtUtil.generateToken(user.getUsername(), user.getRole().name());
        Long eid = resolveEmpresaPdvId(user);
        boolean troca = Boolean.TRUE.equals(user.getMustChangePassword());
        return new LoginResponse(token, user.getId(), user.getUsername(), user.getRole(), "Login realizado com sucesso", eid, troca);
    }

    /**
     * Cadastro público (tela login): exige ID da empresa (cliente) e código de convite válido.
     * Sempre cria perfil VENDEDOR.
     */
    @Transactional
    public LoginResponse register(RegisterRequest request) {
        if (usuarioRepository.findByUsernameLenient(request.getUsername()).isPresent()) {
            return new LoginResponse(null, null, null, null, "Usuário já existe", null, null);
        }
        Long empresaId = request.getEmpresaId();
        if (empresaId == null || empresaId < 1) {
            return new LoginResponse(null, null, null, null,
                    "Informe o ID da empresa e o código de convite fornecido pelo administrador.", null, null);
        }
        if (!clienteService.validarCodigoConvite(empresaId, request.getCodigoConvite())) {
            return new LoginResponse(null, null, null, null,
                    "Código de convite inválido ou empresa sem código ativo. Solicite um novo código ao administrador.", null, null);
        }

        Usuario newUser = new Usuario();
        newUser.setUsername(request.getUsername());
        newUser.setPassword(passwordEncoder.encode(request.getPassword()));
        newUser.setRole(Role.VENDEDOR);
        newUser.setEmpresaId(empresaId);
        newUser.setTelefone(null);
        newUser.setMustChangePassword(false);

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
                "Usuário cadastrado com sucesso", eid, false);
    }

    /** Cadastro pelo administrador (retaguarda), sem código de convite. Senha vazia = aleatória + obrigar troca. */
    @Transactional
    public AdminCreateUserResponse createByAdmin(AdminCreateUserRequest request) {
        return createByAdmin(request, null);
    }

    /** Cadastro com escopo do solicitante (ADM = global, ADMIN_EMPRESA = apenas empresa própria). */
    @Transactional
    public AdminCreateUserResponse createByAdmin(AdminCreateUserRequest request, Usuario requester) {
        if (usuarioRepository.findByUsernameLenient(request.getUsername()).isPresent()) {
            throw new IllegalArgumentException("Usuário já existe");
        }
        String plain = null;
        boolean gerada;
        if (request.getPassword() == null || request.getPassword().isBlank()) {
            plain = gerarSenhaProvisoria();
            gerada = true;
        } else {
            if (request.getPassword().length() < 4) {
                throw new IllegalArgumentException("Senha deve ter pelo menos 4 caracteres");
            }
            plain = request.getPassword();
            gerada = false;
        }
        Usuario u = new Usuario();
        u.setUsername(request.getUsername().trim());
        u.setPassword(passwordEncoder.encode(plain));
        Role roleReq = request.getRole() != null ? request.getRole() : Role.VENDEDOR;
        Long empresaReq = request.getEmpresaId() != null && request.getEmpresaId() >= 1 ? request.getEmpresaId() : null;

        if (requester != null && requester.getRole() == Role.ADMIN_EMPRESA) {
            if (requester.getEmpresaId() == null || requester.getEmpresaId() < 1) {
                throw new IllegalArgumentException("Administrador da empresa sem empresa vinculada.");
            }
            if (roleReq == Role.ADM) {
                throw new IllegalArgumentException("Sem permissão para criar perfil ADM.");
            }
            // ADMIN_EMPRESA só cria usuários da própria empresa
            empresaReq = requester.getEmpresaId();
        }

        u.setRole(roleReq);
        u.setEmpresaId(empresaReq);
        u.setMustChangePassword(gerada);
        if (request.getTelefone() != null) {
            String t = request.getTelefone().trim();
            u.setTelefone(t.isEmpty() ? null : t);
        }
        u = usuarioRepository.save(u);
        return new AdminCreateUserResponse(
                u.getId(),
                u.getUsername(),
                u.getRole(),
                u.getEmpresaId(),
                u.getTelefone(),
                gerada ? plain : null,
                gerada);
    }

    private static String gerarSenhaProvisoria() {
        final String chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
        SecureRandom r = new SecureRandom();
        StringBuilder sb = new StringBuilder(14);
        for (int i = 0; i < 14; i++) {
            sb.append(chars.charAt(r.nextInt(chars.length())));
        }
        return sb.toString();
    }

    @Transactional
    public void trocarSenhaPrimeiroAcesso(String username, String senhaAtual, String novaSenha) {
        Usuario user = usuarioRepository.findByUsernameLenient(username)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado"));
        if (!Boolean.TRUE.equals(user.getMustChangePassword())) {
            throw new IllegalStateException("Não há obrigatoriedade de troca de senha para esta conta.");
        }
        if (!passwordEncoder.matches(senhaAtual, user.getPassword())) {
            throw new IllegalArgumentException("Senha atual incorreta");
        }
        if (novaSenha == null || novaSenha.length() < 6) {
            throw new IllegalArgumentException("Nova senha deve ter no mínimo 6 caracteres");
        }
        user.setPassword(passwordEncoder.encode(novaSenha));
        user.setMustChangePassword(false);
        usuarioRepository.save(user);
    }

    public List<Usuario> findAll() {
        return usuarioRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public List<Usuario> findAllByEmpresa(Long empresaId) {
        if (empresaId == null) return List.of();
        return usuarioRepository.findByEmpresaId(empresaId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public Optional<Usuario> findById(Long id) {
        return usuarioRepository.findById(id);
    }

    public Optional<Usuario> findByUsername(String username) {
        return usuarioRepository.findByUsernameLenient(username);
    }

    @Transactional
    public void delete(Long id) {
        delete(id, null);
    }

    @Transactional
    public void delete(Long id, Usuario requester) {
        if (!usuarioRepository.existsById(id)) {
            throw new IllegalArgumentException("Usuário não encontrado");
        }
        Usuario target = usuarioRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado"));

        if (requester != null && requester.getRole() == Role.ADMIN_EMPRESA) {
            if (requester.getEmpresaId() == null || !requester.getEmpresaId().equals(target.getEmpresaId())) {
                throw new IllegalStateException("Sem permissão para excluir usuário de outra empresa.");
            }
            if (target.getRole() == Role.ADM) {
                throw new IllegalStateException("Sem permissão para excluir perfil ADM.");
            }
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
        fechamentoCaixaRepository.desvincularUsuario(id);
        usuarioRepository.deleteById(id);
    }

    public Usuario update(Long id, UpdateUserRequest request) {
        return update(id, request, null);
    }

    public Usuario update(Long id, UpdateUserRequest request, Usuario requester) {
        Optional<Usuario> userOpt = usuarioRepository.findById(id);
        
        if (userOpt.isEmpty()) {
            return null;
        }
        
        Usuario user = userOpt.get();

        if (requester != null && requester.getRole() == Role.ADMIN_EMPRESA) {
            if (requester.getEmpresaId() == null || !requester.getEmpresaId().equals(user.getEmpresaId())) {
                throw new IllegalStateException("Sem permissão para atualizar usuário de outra empresa.");
            }
            if (request.getRole() == Role.ADM) {
                throw new IllegalStateException("Sem permissão para promover usuário para ADM.");
            }
            // trava empresa no escopo do admin da empresa
            request.setEmpresaIdPdv(requester.getEmpresaId());
            request.setAplicarEmpresaPdv(true);
        }
        
        // Atualizar username
        user.setUsername(request.getUsername());
        
        // Atualizar role se fornecida
        if (request.getRole() != null) {
            user.setRole(request.getRole());
        }
        
        // Atualizar senha se fornecida
        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
            user.setMustChangePassword(false);
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

