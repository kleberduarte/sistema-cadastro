package com.sistema.cadastro.dto;

import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class FecharCaixaRequest {
    private Long terminalId;

    @PositiveOrZero(message = "Valor em caixa não pode ser negativo")
    private BigDecimal valorInformadoDinheiro;
}

