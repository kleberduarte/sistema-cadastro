package com.sistema.cadastro.service;

import com.sistema.cadastro.dto.ClienteRequest;
import com.sistema.cadastro.dto.ClienteResponse;
import com.sistema.cadastro.dto.CodigoConviteResponse;
import com.sistema.cadastro.model.Cliente;
import com.sistema.cadastro.model.PdvConvitePorEmpresa;
import com.sistema.cadastro.model.Role;
import com.sistema.cadastro.model.Usuario;
import com.sistema.cadastro.repository.ClienteRepository;
import com.sistema.cadastro.repository.PdvConvitePorEmpresaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ClienteService {

    private final ClienteRepository clienteRepository;
    private final PdvConvitePorEmpresaRepository pdvConvitePorEmpresaRepository;
    private final CodigoConvitePdvCryptoService codigoConvitePdvCryptoService;
    private final EmpresaScopeService empresaScopeService;

    @Transactional
    public ClienteResponse create(ClienteRequest request, Usuario u, Long empresaIdParam) {
        long empresaId = empresaScopeService.resolveForWrite(u, empresaIdParam);
        if (clienteRepository.existsByEmpresaIdAndEmail(empresaId, request.getEmail())) {
            throw new RuntimeException("E-mail já cadastrado para esta empresa");
        }
        if (clienteRepository.existsByEmpresaIdAndCpf(empresaId, request.getCpf())) {
            throw new RuntimeException("CPF já cadastrado para esta empresa");
        }

        Cliente cliente = new Cliente();
        cliente.setEmpresaId(empresaId);
        cliente.setNome(request.getNome());
        cliente.setEmail(request.getEmail());
        cliente.setTelefone(request.getTelefone());
        cliente.setEndereco(request.getEndereco());
        cliente.setCpf(request.getCpf());

        Cliente saved = clienteRepository.save(cliente);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ClienteResponse> findAll(Usuario u, Long empresaIdParam) {
        Optional<Long> scope = empresaScopeService.resolveForList(u, empresaIdParam);
        if (scope.isEmpty()) {
            return clienteRepository.findAll().stream()
                    .map(this::toResponse)
                    .collect(Collectors.toList());
        }
        return clienteRepository.findByEmpresaId(scope.get()).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ClienteResponse findById(Long id, Usuario u, Long empresaIdParam) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cliente não encontrado"));
        assertClienteReadable(u, cliente, empresaIdParam);
        return toResponse(cliente);
    }

    @Transactional
    public ClienteResponse update(Long id, ClienteRequest request, Usuario u, Long empresaIdParam) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cliente não encontrado"));
        assertClienteReadable(u, cliente, empresaIdParam);
        long empresaId = cliente.getEmpresaId();

        if (!cliente.getEmail().equalsIgnoreCase(request.getEmail())
                && clienteRepository.existsByEmpresaIdAndEmail(empresaId, request.getEmail())) {
            throw new RuntimeException("E-mail já cadastrado para esta empresa");
        }
        if (!cliente.getCpf().equals(request.getCpf())
                && clienteRepository.existsByEmpresaIdAndCpf(empresaId, request.getCpf())) {
            throw new RuntimeException("CPF já cadastrado para esta empresa");
        }

        cliente.setNome(request.getNome());
        cliente.setEmail(request.getEmail());
        cliente.setTelefone(request.getTelefone());
        cliente.setEndereco(request.getEndereco());
        cliente.setCpf(request.getCpf());

        Cliente updated = clienteRepository.save(cliente);
        return toResponse(updated);
    }

    @Transactional
    public void delete(Long id, Usuario u, Long empresaIdParam) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cliente não encontrado"));
        assertClienteReadable(u, cliente, empresaIdParam);
        clienteRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<ClienteResponse> search(String term, Usuario u, Long empresaIdParam) {
        Optional<Long> scope = empresaScopeService.resolveForList(u, empresaIdParam);
        Long eid = scope.orElse(null);
        return clienteRepository.search(term, eid).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private void assertClienteReadable(Usuario u, Cliente c, Long empresaIdParam) {
        Optional<Long> scope = empresaScopeService.resolveForList(u, empresaIdParam);
        if (scope.isEmpty()) {
            if (u.getRole() == Role.ADM) {
                return;
            }
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (!c.getEmpresaId().equals(scope.get())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cliente de outra empresa.");
        }
    }

    @Transactional
    public CodigoConviteResponse regenerarCodigoConvitePdv(Long empresaId) {
        if (empresaId == null || empresaId < 1) {
            throw new IllegalArgumentException("ID da empresa inválido");
        }
        String codePlain = gerarCodigoAleatorio();
        String codeEncrypted = codigoConvitePdvCryptoService.encrypt(codePlain);
        Optional<Cliente> opt = clienteRepository.findById(empresaId);
        if (opt.isPresent()) {
            Cliente c = opt.get();
            c.setCodigoConvitePdv(codeEncrypted);
            clienteRepository.save(c);
            pdvConvitePorEmpresaRepository.deleteById(empresaId);
            return new CodigoConviteResponse(empresaId, c.getNome(), codePlain);
        }
        String label = "Empresa padrão / ID " + empresaId + " (sem cadastro de cliente)";
        pdvConvitePorEmpresaRepository.save(new PdvConvitePorEmpresa(empresaId, codeEncrypted, label));
        return new CodigoConviteResponse(empresaId, label, codePlain);
    }

    @Transactional(readOnly = true)
    public CodigoConviteResponse obterCodigoConvitePdv(Long empresaId) {
        if (empresaId == null || empresaId < 1) {
            return null;
        }
        Optional<Cliente> clOpt = clienteRepository.findById(empresaId);
        if (clOpt.isPresent()) {
            Cliente c = clOpt.get();
            if (c.getCodigoConvitePdv() != null && !c.getCodigoConvitePdv().isBlank()) {
                String plain = codigoConvitePdvCryptoService.decryptOrPlain(c.getCodigoConvitePdv());
                return new CodigoConviteResponse(empresaId, c.getNome(), plain);
            }
        }
        return pdvConvitePorEmpresaRepository.findById(empresaId)
                .map(p -> new CodigoConviteResponse(
                        empresaId,
                        p.getDescricaoEmpresa() != null && !p.getDescricaoEmpresa().isBlank()
                                ? p.getDescricaoEmpresa()
                                : "Empresa padrão / ID " + empresaId + " (sem cadastro de cliente)",
                        codigoConvitePdvCryptoService.decryptOrPlain(p.getCodigo())
                ))
                .orElse(null);
    }

    public String nomeExibicaoEmpresaConvite(Long empresaId) {
        if (empresaId == null || empresaId < 1) {
            return "";
        }
        return clienteRepository.findById(empresaId)
                .map(Cliente::getNome)
                .orElse("Empresa padrão / ID " + empresaId + " (sem cadastro de cliente)");
    }

    public boolean validarCodigoConvite(Long clienteId, String codigo) {
        if (codigo == null || codigo.isBlank() || clienteId == null || clienteId < 1) {
            return false;
        }
        String c = codigo.trim();
        Optional<Cliente> clOpt = clienteRepository.findById(clienteId);
        if (clOpt.isPresent()) {
            String stored = clOpt.get().getCodigoConvitePdv();
            if (stored != null && !stored.isBlank()) {
                String plain = codigoConvitePdvCryptoService.decryptOrPlain(stored);
                return plain != null && plain.trim().equalsIgnoreCase(c);
            }
        }
        return pdvConvitePorEmpresaRepository.findById(clienteId)
                .map(p -> {
                    String stored = p.getCodigo();
                    if (stored == null || stored.isBlank()) return false;
                    String plain = codigoConvitePdvCryptoService.decryptOrPlain(stored);
                    return plain != null && plain.trim().equalsIgnoreCase(c);
                })
                .orElse(false);
    }

    @Transactional
    public void consumirCodigoConvitePdv(Long empresaId) {
        if (empresaId == null || empresaId < 1) return;

        Optional<Cliente> clOpt = clienteRepository.findById(empresaId);
        if (clOpt.isPresent()) {
            Cliente c = clOpt.get();
            c.setCodigoConvitePdv(null);
            clienteRepository.save(c);
            return;
        }

        pdvConvitePorEmpresaRepository.findById(empresaId)
                .ifPresent(p -> pdvConvitePorEmpresaRepository.deleteById(empresaId));
    }

    private static String gerarCodigoAleatorio() {
        final String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        SecureRandom r = new SecureRandom();
        StringBuilder sb = new StringBuilder(10);
        for (int i = 0; i < 10; i++) {
            sb.append(chars.charAt(r.nextInt(chars.length())));
        }
        return sb.toString();
    }

    private ClienteResponse toResponse(Cliente cliente) {
        ClienteResponse response = new ClienteResponse();
        response.setId(cliente.getId());
        response.setEmpresaId(cliente.getEmpresaId());
        response.setNome(cliente.getNome());
        response.setEmail(cliente.getEmail());
        response.setTelefone(cliente.getTelefone());
        response.setEndereco(cliente.getEndereco());
        response.setCpf(cliente.getCpf());
        response.setCreatedAt(cliente.getCreatedAt());
        response.setUpdatedAt(cliente.getUpdatedAt());
        response.setPossuiCodigoConvitePdv(
                cliente.getCodigoConvitePdv() != null && !cliente.getCodigoConvitePdv().isBlank());
        return response;
    }
}
