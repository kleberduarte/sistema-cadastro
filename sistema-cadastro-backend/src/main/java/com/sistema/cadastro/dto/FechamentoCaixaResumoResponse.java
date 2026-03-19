package com.sistema.cadastro.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FechamentoCaixaResumoResponse {
    private LocalDate dataReferencia;
    private Integer quantidadeVendas;
    private BigDecimal totalDinheiro;
    private BigDecimal totalCartao;
    private BigDecimal totalPix;
    private BigDecimal totalGeral;
}

