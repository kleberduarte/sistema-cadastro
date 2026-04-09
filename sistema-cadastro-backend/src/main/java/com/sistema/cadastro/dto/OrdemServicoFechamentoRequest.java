package com.sistema.cadastro.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrdemServicoFechamentoRequest {
    private Boolean gerarVenda;
    private String formaPagamento;
    private Integer parcelas;
}
