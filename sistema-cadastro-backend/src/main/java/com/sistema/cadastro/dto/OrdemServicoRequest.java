package com.sistema.cadastro.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrdemServicoRequest {
    private Long clienteId;
    private String nomeCliente;
    private String contatoCliente;
    private String equipamento;
    private String marca;
    private String modelo;
    private String numeroSerie;
    private String defeitoRelatado;
    private String diagnostico;
    private String servicoExecutado;
    private String tecnicoResponsavel;
    private String observacao;
    private BigDecimal valorServico;
    private BigDecimal desconto;
    private BigDecimal valorTotal;
    private String status;
    private LocalDateTime dataPrevisaoEntrega;
}
