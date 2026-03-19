package com.sistema.cadastro.repository;

import com.sistema.cadastro.model.ParametroEmpresa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ParametroEmpresaRepository extends JpaRepository<ParametroEmpresa, Long> {
    Optional<ParametroEmpresa> findByEmpresaId(Long empresaId);
    Optional<ParametroEmpresa> findByEmpresaIdAndAtivoTrue(Long empresaId);
    Optional<ParametroEmpresa> findFirstByEmpresaId(Long empresaId);

    @Query("select coalesce(max(p.empresaId), 0) from ParametroEmpresa p")
    Long maxEmpresaId();
}
