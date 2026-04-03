package com.sistema.cadastro.repository;

import com.sistema.cadastro.model.PdvTerminal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PdvTerminalRepository extends JpaRepository<PdvTerminal, Long> {

    List<PdvTerminal> findByEmpresaIdOrderByCodigoAsc(Long empresaId);

    Optional<PdvTerminal> findByEmpresaIdAndCodigoIgnoreCase(Long empresaId, String codigo);
}
