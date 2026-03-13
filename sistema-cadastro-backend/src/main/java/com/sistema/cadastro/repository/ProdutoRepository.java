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
    @Query("SELECT p FROM Produto p WHERE LOWER(p.nome) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR LOWER(p.descricao) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR LOWER(p.categoria) LIKE LOWER(CONCAT('%', :searchTerm, '%'))")
    List<Produto> search(@Param("searchTerm") String searchTerm);
    
    List<Produto> findByCategoria(String categoria);

    Optional<Produto> findByCodigoProduto(String codigoProduto);

    boolean existsByCodigoProduto(String codigoProduto);

    boolean existsByCodigoProdutoAndIdNot(String codigoProduto, Long id);
}
