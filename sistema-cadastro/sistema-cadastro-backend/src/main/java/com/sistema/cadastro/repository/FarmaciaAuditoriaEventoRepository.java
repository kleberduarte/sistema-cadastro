package com.sistema.cadastro.repository;

import com.sistema.cadastro.model.FarmaciaAuditoriaEvento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FarmaciaAuditoriaEventoRepository extends JpaRepository<FarmaciaAuditoriaEvento, Long> {
    List<FarmaciaAuditoriaEvento> findTop100ByEmpresaIdOrderByCreatedAtDesc(Long empresaId);
}

