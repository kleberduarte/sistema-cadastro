package com.sistema.cadastro.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "ordens_servico")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrdemServico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "empresa_id", nullable = false)
    private Long empresaId;

    @Column(name = "numero_os", nullable = false)
    private Long numeroOs;

    @Column(name = "cliente_id")
    private Long clienteId;

    @Column(name = "nome_cliente", length = 180)
    private String nomeCliente;

    @Column(name = "contato_cliente", length = 120)
    private String contatoCliente;

    @Column(name = "codigo_cliente", length = 40)
    private String codigoCliente;

    @Column(name = "telefone_cliente", length = 40)
    private String telefoneCliente;

    @Column(name = "setor_cliente", length = 80)
    private String setorCliente;

    @Column(name = "nome_contato", length = 120)
    private String nomeContato;

    @Column(name = "equipamento", nullable = false, length = 140)
    private String equipamento;

    @Column(name = "marca", length = 80)
    private String marca;

    @Column(name = "modelo", length = 120)
    private String modelo;

    @Column(name = "numero_serie", length = 120)
    private String numeroSerie;

    @Column(name = "patrimonio", length = 120)
    private String patrimonio;

    @Column(name = "acessorios", columnDefinition = "TEXT")
    private String acessorios;

    @Column(name = "tipo_ordem_servico", length = 40)
    private String tipoOrdemServico;

    @Column(name = "defeito_relatado", columnDefinition = "TEXT")
    private String defeitoRelatado;

    @Column(name = "diagnostico", columnDefinition = "TEXT")
    private String diagnostico;

    @Column(name = "servico_executado", columnDefinition = "TEXT")
    private String servicoExecutado;

    @Column(name = "tecnico_responsavel", length = 120)
    private String tecnicoResponsavel;

    @Column(name = "observacao", columnDefinition = "TEXT")
    private String observacao;

    @Column(name = "contrato_identificacao", length = 120)
    private String contratoIdentificacao;

    @Column(name = "nf_compra", length = 60)
    private String nfCompra;

    @Column(name = "data_compra")
    private LocalDate dataCompra;

    @Column(name = "loja_compra", length = 120)
    private String lojaCompra;

    @Column(name = "numero_certificado", length = 80)
    private String numeroCertificado;

    @Column(name = "senha_equipamento", length = 120)
    private String senhaEquipamento;

    @Column(name = "os_externa", length = 80)
    private String osExterna;

    @Column(name = "valor_servico", precision = 10, scale = 2)
    private BigDecimal valorServico;

    @Column(name = "desconto", precision = 10, scale = 2)
    private BigDecimal desconto;

    @Column(name = "valor_total", precision = 10, scale = 2)
    private BigDecimal valorTotal;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "data_abertura", nullable = false)
    private LocalDateTime dataAbertura;

    @Column(name = "data_previsao_entrega")
    private LocalDateTime dataPrevisaoEntrega;

    @Column(name = "data_conclusao")
    private LocalDateTime dataConclusao;

    @Column(name = "data_entrega")
    private LocalDateTime dataEntrega;

    @Column(name = "venda_id")
    private Long vendaId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
