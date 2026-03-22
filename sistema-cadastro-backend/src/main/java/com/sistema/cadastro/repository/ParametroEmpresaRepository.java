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

    /**
     * Maior {@code empresa_id} em uso em qualquer tabela tenant, não só em {@code parametros_empresa}.
     * Evita reutilizar um ID ainda presente em produtos/vendas após exclusão só do cadastro de parâmetros.
     */
    @Query(value = """
            SELECT GREATEST(
              COALESCE((SELECT MAX(empresa_id) FROM parametros_empresa), 0),
              COALESCE((SELECT MAX(empresa_id) FROM produtos), 0),
              COALESCE((SELECT MAX(empresa_id) FROM clientes), 0),
              COALESCE((SELECT MAX(empresa_id) FROM vendas), 0),
              COALESCE((SELECT MAX(empresa_id) FROM pdv_terminais), 0),
              COALESCE((SELECT MAX(empresa_id) FROM fechamentos_caixa), 0),
              COALESCE((SELECT MAX(empresa_id_pdv) FROM usuarios), 0)
            )
            """, nativeQuery = true)
    Long maxEmpresaId();
}
