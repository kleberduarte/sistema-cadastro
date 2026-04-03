package com.sistema.cadastro.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProdutoImportPreviewResponseDTO {
    private long empresaId;
    private int totalLinhas;
    private int validas;
    private int invalidas;
    private int criar;
    private int atualizar;

    @Builder.Default
    private List<ProdutoImportPreviewItemDTO> itens = new ArrayList<>();
}
