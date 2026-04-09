package com.sistema.cadastro.repository;

import com.sistema.cadastro.model.OrdemServico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface OrdemServicoRepository extends JpaRepository<OrdemServico, Long> {
    Optional<OrdemServico> findByIdAndEmpresaId(Long id, Long empresaId);

    List<OrdemServico> findByEmpresaIdOrderByDataAberturaDesc(Long empresaId);

    List<OrdemServico> findByEmpresaIdAndStatusOrderByDataAberturaDesc(Long empresaId, String status);

    @Query("select os from OrdemServico os where os.empresaId = :empresaId and os.dataAbertura between :inicio and :fim order by os.dataAbertura desc")
    List<OrdemServico> findByEmpresaIdAndDataAberturaBetween(
            @Param("empresaId") Long empresaId,
            @Param("inicio") LocalDateTime inicio,
            @Param("fim") LocalDateTime fim);

    @Query("select max(os.numeroOs) from OrdemServico os where os.empresaId = :empresaId")
    Long maxNumeroByEmpresaId(@Param("empresaId") Long empresaId);
}
