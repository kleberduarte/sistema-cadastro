package com.sistema.cadastro.repository;

import com.sistema.cadastro.model.PmcReferencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PmcReferenciaRepository extends JpaRepository<PmcReferencia, Long> {
    @Query("""
            SELECT p FROM PmcReferencia p
            WHERE p.empresaId = :empresaId
              AND (:registroMs IS NOT NULL AND p.registroMs = :registroMs
                   OR :gtinEan IS NOT NULL AND p.gtinEan = :gtinEan)
              AND p.vigenciaInicio <= :dataRef
              AND (p.vigenciaFim IS NULL OR p.vigenciaFim >= :dataRef)
            ORDER BY p.vigenciaInicio DESC, p.id DESC
            """)
    List<PmcReferencia> findVigenteByChave(@Param("empresaId") Long empresaId,
                                           @Param("registroMs") String registroMs,
                                           @Param("gtinEan") String gtinEan,
                                           @Param("dataRef") LocalDate dataRef);

    Optional<PmcReferencia> findTopByEmpresaIdOrderByCreatedAtDesc(Long empresaId);
}

