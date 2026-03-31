package com.sistema.cadastro.service;

import com.sistema.cadastro.model.PmcReferencia;
import com.sistema.cadastro.model.ParametroEmpresa;
import com.sistema.cadastro.repository.ParametroEmpresaRepository;
import com.sistema.cadastro.repository.PmcReferenciaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class PmcMonitorJob {
    private final ParametroEmpresaRepository parametroEmpresaRepository;
    private final PmcReferenciaRepository pmcReferenciaRepository;
    private final FarmaciaSupportService farmaciaSupportService;
    private final PmcService pmcService;

    @Scheduled(cron = "${app.pmc.sync.cron:0 0 3 * * *}")
    public void monitorarAtualizacaoPmc() {
        parametroEmpresaRepository.findAll().forEach(p -> {
            if (!Boolean.TRUE.equals(p.getFarmaciaPmcAtivo())) return;
            PmcReferencia ult = pmcReferenciaRepository.findTopByEmpresaIdOrderByCreatedAtDesc(p.getEmpresaId()).orElse(null);
            if (ult == null) {
                log.warn("Empresa {} sem base PMC carregada.", p.getEmpresaId());
                farmaciaSupportService.audit(p.getEmpresaId(), null, "PMC_SEM_BASE", "PMC_REFERENCIA", null, "sem registros");
                return;
            }
            if (ult.getCreatedAt() != null && ult.getCreatedAt().isBefore(LocalDateTime.now().minusDays(40))) {
                log.warn("Empresa {} com base PMC potencialmente desatualizada. Última carga em {}", p.getEmpresaId(), ult.getCreatedAt());
                farmaciaSupportService.audit(p.getEmpresaId(), null, "PMC_BASE_DESATUALIZADA", "PMC_REFERENCIA", ult.getId(),
                        "ultimaCarga=" + ult.getCreatedAt());
            }
        });
    }

    @Scheduled(cron = "${app.pmc.sync.cron:0 0 3 * * *}")
    public void sincronizarPmcAutomaticamente() {
        for (ParametroEmpresa p : parametroEmpresaRepository.findAll()) {
            if (!Boolean.TRUE.equals(p.getFarmaciaPmcAtivo())) continue;
            try {
                pmcService.syncFromConfiguredSourceForEmpresa(p.getEmpresaId(), null);
            } catch (Exception e) {
                log.warn("Falha no sync automático PMC da empresa {}: {}", p.getEmpresaId(), e.getMessage());
                farmaciaSupportService.audit(p.getEmpresaId(), null, "PMC_SYNC_FALHA", "PMC_REFERENCIA", null, e.getMessage());
            }
        }
    }
}

