package com.sistema.cadastro.dto;

import com.sistema.cadastro.model.PdvCaixaStatus;
import lombok.Data;

@Data
public class PdvHeartbeatRequest {
    private Long terminalId;
    private PdvCaixaStatus statusCaixa;
}
