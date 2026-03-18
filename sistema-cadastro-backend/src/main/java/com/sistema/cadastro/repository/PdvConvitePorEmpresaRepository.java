package com.sistema.cadastro.repository;

import com.sistema.cadastro.model.PdvConvitePorEmpresa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PdvConvitePorEmpresaRepository extends JpaRepository<PdvConvitePorEmpresa, Long> {
}
