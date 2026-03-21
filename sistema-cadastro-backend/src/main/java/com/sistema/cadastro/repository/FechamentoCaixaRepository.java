package com.sistema.cadastro.repository;

import com.sistema.cadastro.model.FechamentoCaixa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface FechamentoCaixaRepository extends JpaRepository<FechamentoCaixa, Long> {
    List<FechamentoCaixa> findTop100ByEmpresaIdOrderByDataFechamentoDesc(Long empresaId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE FechamentoCaixa f SET f.terminalId = null WHERE f.terminalId = :terminalId")
    int desvincularTerminal(@Param("terminalId") Long terminalId);
}

