package com.sistema.cadastro.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class PmcImportItemDTO {
    private String registroMs;
    private String gtinEan;
    private String descricao;
    private BigDecimal pmc;
    private LocalDate vigenciaInicio;
    private LocalDate vigenciaFim;
}

