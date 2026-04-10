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
public class OrdemServicoRequest {
    private Long clienteId;
    private String nomeCliente;
    private String contatoCliente;
    private String codigoCliente;
    private String telefoneCliente;
    private String setorCliente;
    private String nomeContato;
    private String equipamento;
    private String marca;
    private String modelo;
    private String numeroSerie;
    private String patrimonio;
    private String acessorios;
    private String tipoOrdemServico;
    private String defeitoRelatado;
    private String diagnostico;
    private String servicoExecutado;
    private String tecnicoResponsavel;
    private String observacao;
    private String contratoIdentificacao;
    private String nfCompra;
    private LocalDate dataCompra;
    private String lojaCompra;
    private String numeroCertificado;
    private String senhaEquipamento;
    private String osExterna;
    private BigDecimal valorServico;
    private BigDecimal desconto;
    private BigDecimal valorTotal;
    private String status;
    private LocalDateTime dataPrevisaoEntrega;
}
