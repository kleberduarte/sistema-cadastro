package com.sistema.cadastro.dto;

import lombok.Data;

@Data
public class PdvTerminalUpdateRequest {
    private String codigo;
    private String nome;
    private Boolean ativo;
}
