package com.sistema.cadastro.repository;

import com.sistema.cadastro.model.ProdutoLote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProdutoLoteRepository extends JpaRepository<ProdutoLote, Long> {
    List<ProdutoLote> findByEmpresaIdAndProdutoIdOrderByValidadeAscIdAsc(Long empresaId, Long produtoId);
    Optional<ProdutoLote> findByEmpresaIdAndProdutoIdAndCodigoLote(Long empresaId, Long produtoId, String codigoLote);
}

