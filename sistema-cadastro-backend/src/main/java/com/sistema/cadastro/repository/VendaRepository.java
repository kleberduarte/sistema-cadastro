package com.sistema.cadastro.repository;

import com.sistema.cadastro.model.Venda;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface VendaRepository extends JpaRepository<Venda, Long> {
    
    List<Venda> findByUsuarioId(Long usuarioId);

    long countByUsuario_Id(Long usuarioId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "UPDATE vendas SET usuario_id = :targetId WHERE usuario_id = :sourceId", nativeQuery = true)
    int reatribuirVendasAoUsuario(@Param("sourceId") Long sourceId, @Param("targetId") Long targetId);
    
    @Query("SELECT v FROM Venda v WHERE v.dataVenda >= :startDate AND v.dataVenda <= :endDate ORDER BY v.dataVenda DESC")
    List<Venda> findByDataVendaBetween(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    @Query("SELECT v FROM Venda v WHERE v.dataVenda >= :startDate AND v.dataVenda <= :endDate")
    List<Venda> findAllByDataVendaBetween(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    @Query("SELECT v FROM Venda v WHERE v.usuario.id = :usuarioId AND v.dataVenda >= :startDate AND v.dataVenda <= :endDate ORDER BY v.dataVenda DESC")
    List<Venda> findByUsuarioIdAndDataVendaBetween(@Param("usuarioId") Long usuarioId,
                                                   @Param("startDate") LocalDateTime startDate,
                                                   @Param("endDate") LocalDateTime endDate);
}

