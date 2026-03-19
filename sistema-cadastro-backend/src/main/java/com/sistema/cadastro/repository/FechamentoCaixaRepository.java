package com.sistema.cadastro.repository;

import com.sistema.cadastro.model.FechamentoCaixa;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FechamentoCaixaRepository extends JpaRepository<FechamentoCaixa, Long> {
    List<FechamentoCaixa> findTop100ByEmpresaIdOrderByDataFechamentoDesc(Long empresaId);
}

