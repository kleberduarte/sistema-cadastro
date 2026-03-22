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
public class ProdutoImportConfirmResponseDTO {
    private long empresaId;
    private int totalLinhas;
    private int criados;
    private int atualizados;
    private int ignorados;
    private int erros;

    @Builder.Default
    private List<ProdutoImportPreviewItemDTO> detalhes = new ArrayList<>();
}
