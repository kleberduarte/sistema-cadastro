package com.sistema.cadastro.repository;

import com.sistema.cadastro.model.Produto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProdutoRepository extends JpaRepository<Produto, Long> {

    List<Produto> findByEmpresaId(Long empresaId);

    Optional<Produto> findByEmpresaIdAndCodigoProduto(Long empresaId, String codigoProduto);

    boolean existsByEmpresaIdAndCodigoProduto(Long empresaId, String codigoProduto);

    boolean existsByEmpresaIdAndCodigoProdutoAndIdNot(Long empresaId, String codigoProduto, Long id);

    @Query("""
            SELECT p FROM Produto p
            WHERE (LOWER(p.nome) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
                OR LOWER(p.descricao) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
                OR LOWER(p.categoria) LIKE LOWER(CONCAT('%', :searchTerm, '%')))
              AND (:empresaId IS NULL OR p.empresaId = :empresaId)
            """)
    List<Produto> search(@Param("searchTerm") String searchTerm, @Param("empresaId") Long empresaId);

    @Query("""
            SELECT p FROM Produto p
            WHERE p.categoria = :categoria
              AND (:empresaId IS NULL OR p.empresaId = :empresaId)
            """)
    List<Produto> findByCategoriaScoped(@Param("categoria") String categoria, @Param("empresaId") Long empresaId);
}
