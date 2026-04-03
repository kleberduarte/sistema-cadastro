package com.sistema.cadastro.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.sistema.cadastro.model.PdvCaixaStatus;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PdvTerminalResponse {
    private Long id;
    private Long empresaId;
    private String codigo;
    private String nome;
    private boolean ativo;
    private Instant ultimoHeartbeat;
    private String ultimoOperador;
    private boolean online;
    private PdvCaixaStatus statusCaixa;
}
