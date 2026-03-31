package com.sistema.cadastro.service;

import com.sistema.cadastro.dto.ParametroEmpresaDTO;
import com.sistema.cadastro.model.ParametroEmpresa;
import com.sistema.cadastro.repository.ParametroEmpresaRepository;
import com.sistema.cadastro.util.LogoUrlSanitizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class ParametroEmpresaService {

    private static final Pattern SUPORTE_EMAIL_SIMPLES = Pattern.compile("^[\\w.%+-]+@[\\w.-]+\\.[A-Za-z]{2,}$");

    @Autowired
    private ParametroEmpresaRepository repository;

    @Autowired
    private EmpresaTenantExclusaoService empresaTenantExclusaoService;

    @Transactional
    public ParametroEmpresaDTO salvar(ParametroEmpresaDTO dto) {
        validarContatosSuporte(dto);

        ParametroEmpresa parametro;

        // Se não informar empresaId (e não é update por id), gera automaticamente (novo cadastro)
        if (dto.getId() == null && dto.getEmpresaId() == null) {
            Long max = repository.maxEmpresaId();
            long next = (max != null ? max : 0L) + 1L;
            if (next < 2L) next = 2L; // reserva 1 para o padrão do sistema
            dto.setEmpresaId(next);
        }

        if (dto.getId() != null) {
            parametro = repository.findById(dto.getId())
                    .orElse(new ParametroEmpresa());
        } else if (dto.getEmpresaId() != null) {
            parametro = repository.findByEmpresaId(dto.getEmpresaId())
                    .orElse(new ParametroEmpresa());
        } else {
            parametro = new ParametroEmpresa();
        }

        parametro.setEmpresaId(dto.getEmpresaId());
        parametro.setNomeEmpresa(dto.getNomeEmpresa());
        parametro.setLogoUrl(normalizarLogoUrlOuErro(dto.getLogoUrl()));
        parametro.setCorPrimaria(dto.getCorPrimaria());
        parametro.setCorSecundaria(dto.getCorSecundaria());
        parametro.setCorFundo(dto.getCorFundo());
        parametro.setCorTexto(dto.getCorTexto());
        parametro.setCorBotao(dto.getCorBotao());
        parametro.setCorBotaoTexto(dto.getCorBotaoTexto());
        parametro.setMensagemBoasVindas(dto.getMensagemBoasVindas());
        parametro.setChavePix(dto.getChavePix());
        parametro.setSuporteEmail(emptyToNull(dto.getSuporteEmail()));
        parametro.setSuporteWhatsapp(emptyToNull(dto.getSuporteWhatsapp()));
        parametro.setSegmento(emptyToNull(dto.getSegmento()));
        parametro.setModuloFarmaciaAtivo(dto.getModuloFarmaciaAtivo() != null ? dto.getModuloFarmaciaAtivo() : false);
        parametro.setFarmaciaLoteValidadeObrigatorio(dto.getFarmaciaLoteValidadeObrigatorio() != null ? dto.getFarmaciaLoteValidadeObrigatorio() : false);
        parametro.setFarmaciaControladosAtivo(dto.getFarmaciaControladosAtivo() != null ? dto.getFarmaciaControladosAtivo() : false);
        parametro.setFarmaciaAntimicrobianosAtivo(dto.getFarmaciaAntimicrobianosAtivo() != null ? dto.getFarmaciaAntimicrobianosAtivo() : false);
        parametro.setFarmaciaPmcAtivo(dto.getFarmaciaPmcAtivo() != null ? dto.getFarmaciaPmcAtivo() : false);
        parametro.setFarmaciaPmcModo(normalizePmcMode(dto.getFarmaciaPmcModo()));
        parametro.setAtivo(dto.getAtivo() == null ? true : dto.getAtivo());

        parametro = repository.save(parametro);
        return toDTO(parametro);
    }

    public Optional<ParametroEmpresaDTO> buscarPorEmpresaId(Long empresaId) {
        return repository.findByEmpresaIdAndAtivoTrue(empresaId)
                .map(this::toDTO);
    }

    public Optional<ParametroEmpresaDTO> buscarPorEmpresaIdComInativos(Long empresaId) {
        return repository.findByEmpresaId(empresaId)
                .map(this::toDTO);
    }

    public Optional<ParametroEmpresaDTO> buscarPorId(Long id) {
        return repository.findById(id)
                .map(this::toDTO);
    }

    public ParametroEmpresaDTO getParametrosAtivos() {
        return repository.findAll().stream()
                .filter(p -> p.getAtivo() != null && p.getAtivo())
                .findFirst()
                .map(this::toDTO)
                .map(this::apenasLogoPublicavel)
                .orElse(getParametrosDefault());
    }

    public ParametroEmpresaDTO getParametrosDefault() {
        ParametroEmpresaDTO dto = new ParametroEmpresaDTO();
        dto.setNomeEmpresa("Sistema de Cadastro");
        dto.setCorPrimaria("#667eea");
        dto.setCorSecundaria("#764ba2");
        dto.setCorFundo("#ffffff");
        dto.setCorTexto("#333333");
        dto.setCorBotao("#667eea");
        dto.setCorBotaoTexto("#ffffff");
        dto.setSegmento(null);
        dto.setModuloFarmaciaAtivo(false);
        dto.setFarmaciaLoteValidadeObrigatorio(false);
        dto.setFarmaciaControladosAtivo(false);
        dto.setFarmaciaAntimicrobianosAtivo(false);
        dto.setFarmaciaPmcAtivo(false);
        dto.setFarmaciaPmcModo("ALERTA");
        dto.setAtivo(true);
        return dto;
    }

    /**
     * Garante registro em banco para o ID (padrão visual + nome).
     * Usado para cadastrar PDV mesmo sem ter "Salvar" em Parâmetros antes.
     */
    @Transactional
    public ParametroEmpresaDTO garantirParametrosMinimos(Long empresaId) {
        if (empresaId == null || empresaId < 1) {
            throw new IllegalArgumentException("empresaId inválido");
        }
        return repository.findByEmpresaId(empresaId)
                .map(this::toDTO)
                .orElseGet(() -> {
                    ParametroEmpresaDTO dto = getParametrosDefault();
                    dto.setEmpresaId(empresaId);
                    return salvar(dto);
                });
    }

    @Transactional
    public void excluir(Long id) {
        repository.deleteById(id);
    }

    @Transactional
    public boolean excluirPorEmpresaId(Long empresaId) {
        if (empresaId != null && empresaId <= 1L) {
            return false;
        }
        return repository.findByEmpresaId(empresaId)
                .map(p -> {
                    empresaTenantExclusaoService.excluirTodosDadosDoTenant(empresaId);
                    repository.delete(p);
                    return true;
                })
                .orElse(false);
    }

    public List<ParametroEmpresaDTO> listarTodos() {
        return repository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<ParametroEmpresaDTO> listarPorEmpresaId(Long empresaId) {
        if (empresaId == null) return List.of();
        return repository.findByEmpresaId(empresaId)
                .map(this::toDTO)
                .map(List::of)
                .orElse(List.of());
    }

    private ParametroEmpresaDTO apenasLogoPublicavel(ParametroEmpresaDTO dto) {
        dto.setLogoUrl(LogoUrlSanitizer.forPublicResponse(dto.getLogoUrl()));
        return dto;
    }

    private ParametroEmpresaDTO toDTO(ParametroEmpresa entity) {
        ParametroEmpresaDTO dto = new ParametroEmpresaDTO();
        dto.setId(entity.getId());
        dto.setEmpresaId(entity.getEmpresaId());
        dto.setNomeEmpresa(entity.getNomeEmpresa());
        dto.setLogoUrl(entity.getLogoUrl());
        dto.setCorPrimaria(entity.getCorPrimaria());
        dto.setCorSecundaria(entity.getCorSecundaria());
        dto.setCorFundo(entity.getCorFundo());
        dto.setCorTexto(entity.getCorTexto());
        dto.setCorBotao(entity.getCorBotao());
        dto.setCorBotaoTexto(entity.getCorBotaoTexto());
        dto.setMensagemBoasVindas(entity.getMensagemBoasVindas());
        dto.setChavePix(entity.getChavePix());
        dto.setSuporteEmail(entity.getSuporteEmail());
        dto.setSuporteWhatsapp(entity.getSuporteWhatsapp());
        dto.setSegmento(entity.getSegmento());
        dto.setModuloFarmaciaAtivo(entity.getModuloFarmaciaAtivo());
        dto.setFarmaciaLoteValidadeObrigatorio(entity.getFarmaciaLoteValidadeObrigatorio());
        dto.setFarmaciaControladosAtivo(entity.getFarmaciaControladosAtivo());
        dto.setFarmaciaAntimicrobianosAtivo(entity.getFarmaciaAntimicrobianosAtivo());
        dto.setFarmaciaPmcAtivo(entity.getFarmaciaPmcAtivo());
        dto.setFarmaciaPmcModo(entity.getFarmaciaPmcModo());
        dto.setAtivo(entity.getAtivo());
        return dto;
    }

    private static String normalizePmcMode(String raw) {
        String t = emptyToNull(raw);
        if (t == null) return "ALERTA";
        String u = t.trim().toUpperCase();
        return "BLOQUEIO".equals(u) ? "BLOQUEIO" : "ALERTA";
    }

    private static String emptyToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private void validarContatosSuporte(ParametroEmpresaDTO dto) {
        String em = dto.getSuporteEmail();
        if (em != null && !em.trim().isEmpty()) {
            String t = em.trim();
            if (t.length() > 255) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "E-mail de suporte muito longo.");
            }
            if (!SUPORTE_EMAIL_SIMPLES.matcher(t).matches()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "E-mail de suporte inválido.");
            }
        }
        String wa = dto.getSuporteWhatsapp();
        if (wa != null && !wa.trim().isEmpty() && wa.trim().length() > 32) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "WhatsApp de suporte: máximo 32 caracteres.");
        }
    }

    private String normalizarLogoUrlOuErro(String raw) {
        try {
            return LogoUrlSanitizer.normalizeForPersistence(raw);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }
}

