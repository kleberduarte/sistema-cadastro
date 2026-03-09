package com.sistema.cadastro.repository;

import com.sistema.cadastro.model.Venda;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface VendaRepository extends JpaRepository<Venda, Long> {
    
    List<Venda> findByUsuarioId(Long usuarioId);
    
    @Query("SELECT v FROM Venda v WHERE v.dataVenda >= :startDate AND v.dataVenda <= :endDate ORDER BY v.dataVenda DESC")
    List<Venda> findByDataVendaBetween(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    @Query("SELECT v FROM Venda v WHERE v.dataVenda >= :startDate AND v.dataVenda <= :endDate")
    List<Venda> findAllByDataVendaBetween(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
}

