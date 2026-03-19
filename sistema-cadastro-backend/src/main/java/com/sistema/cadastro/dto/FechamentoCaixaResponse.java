package com.sistema.cadastro.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FechamentoCaixaResponse {
    private Long id;
    private Long empresaId;
    private Long terminalId;
    private Long usuarioId;
    private String nomeOperador;
    private LocalDate dataReferencia;
    private Integer quantidadeVendas;
    private BigDecimal totalDinheiro;
    private BigDecimal totalCartao;
    private BigDecimal totalPix;
    private BigDecimal totalGeral;
    private BigDecimal valorInformadoDinheiro;
    private BigDecimal diferencaDinheiro;
    private LocalDateTime dataFechamento;
}

