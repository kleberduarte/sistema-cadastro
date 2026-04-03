package com.sistema.cadastro.dto;

import lombok.Data;

@Data
public class PdvVincularRequest {
    private Long empresaId;
    private String codigo;
    /** Obrigatório ao criar terminal novo (1º login neste código). */
    private String nome;
}
