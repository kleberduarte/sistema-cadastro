package com.sistema.cadastro.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Código de convite PDV quando não existe registro em {@link Cliente} com esse ID
 * (ex.: empresa padrão app.pdv.empresa-padrao-id sem cliente correspondente).
 */
@Entity
@Table(name = "pdv_convite_por_empresa")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PdvConvitePorEmpresa {

    @Id
    @Column(name = "empresa_id")
    private Long empresaId;

    @Column(nullable = false, length = 512)
    private String codigo;

    /**
     * Descrição do ID da empresa exibida para o ADM quando não existe registro em {@link Cliente}.
     * (ex.: empresa padrão app.pdv.empresa-padrao-id sem cliente correspondente)
     */
    @Column(name = "descricao_empresa", nullable = true, length = 200)
    private String descricaoEmpresa;
}
