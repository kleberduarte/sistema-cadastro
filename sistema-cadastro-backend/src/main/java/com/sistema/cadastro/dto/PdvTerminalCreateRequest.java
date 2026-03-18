package com.sistema.cadastro.dto;

import lombok.Data;

@Data
public class PdvTerminalCreateRequest {
    private Long empresaId;
    private String codigo;
    private String nome;
}
