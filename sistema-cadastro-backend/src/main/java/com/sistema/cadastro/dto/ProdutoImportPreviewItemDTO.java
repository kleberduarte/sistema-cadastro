package com.sistema.cadastro.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProdutoImportPreviewItemDTO {
    private int linha;
    private String codigoProduto;
    private String nome;
    /** CREATE, UPDATE ou INVALID */
    private String acao;
    private String motivo;
}
