package com.sistema.cadastro.service;

import com.sistema.cadastro.dto.ParametroEmpresaDTO;
import com.sistema.cadastro.model.FarmaciaAuditoriaEvento;
import com.sistema.cadastro.repository.FarmaciaAuditoriaEventoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FarmaciaSupportService {
    private final ParametroEmpresaService parametroEmpresaService;
    private final FarmaciaAuditoriaEventoRepository auditoriaRepository;

    public ParametroEmpresaDTO getTenantConfig(Long empresaId) {
        return parametroEmpresaService.buscarPorEmpresaId(empresaId).orElseGet(parametroEmpresaService::getParametrosDefault);
    }

    public boolean isFarmaciaAtiva(Long empresaId) {
        ParametroEmpresaDTO c = getTenantConfig(empresaId);
        return c.getModuloFarmaciaAtivo() != null && c.getModuloFarmaciaAtivo();
    }

    public String pmcModo(Long empresaId) {
        ParametroEmpresaDTO c = getTenantConfig(empresaId);
        String m = c.getFarmaciaPmcModo() == null ? "ALERTA" : c.getFarmaciaPmcModo().trim().toUpperCase();
        return "BLOQUEIO".equals(m) ? "BLOQUEIO" : "ALERTA";
    }

    /** Grava em transação nova para que bloqueios/erros na venda não revertam o registro (ex.: PMC_BLOQUEIO). */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void audit(Long empresaId, Long usuarioId, String tipoEvento, String entidade, Long entidadeId, String detalhes) {
        FarmaciaAuditoriaEvento e = new FarmaciaAuditoriaEvento();
        e.setEmpresaId(empresaId);
        e.setUsuarioId(usuarioId);
        e.setTipoEvento(tipoEvento);
        e.setEntidade(entidade);
        e.setEntidadeId(entidadeId);
        e.setDetalhes(detalhes);
        auditoriaRepository.save(e);
    }
}

