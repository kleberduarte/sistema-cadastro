package com.sistema.cadastro.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CodigoConviteResponse {
    private Long empresaId;
    private String nomeEmpresa;
    private String codigo;
}
