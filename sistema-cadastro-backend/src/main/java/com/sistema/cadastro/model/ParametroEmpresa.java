package com.sistema.cadastro.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "parametros_empresa")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ParametroEmpresa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "empresa_id", nullable = false, unique = true)
    private Long empresaId;

    // Nome da empresa
    @Column(name = "nome_empresa", length = 200)
    private String nomeEmpresa;

    // Logo da empresa (URL ou base64)
    @Column(name = "logo_url", length = 500)
    private String logoUrl;

    // Cores do sistema
    @Column(name = "cor_primaria", length = 7)
    private String corPrimaria;

    @Column(name = "cor_secundaria", length = 7)
    private String corSecundaria;

    @Column(name = "cor_fundo", length = 7)
    private String corFundo;

    @Column(name = "cor_texto", length = 7)
    private String corTexto;

    @Column(name = "cor_botao", length = 7)
    private String corBotao;

    @Column(name = "cor_botao_texto", length = 7)
    private String corBotaoTexto;

    // Configurações adicionais
    @Column(name = "mensagem_boas_vindas", length = 500)
    private String mensagemBoasVindas;

    // Chave PIX padrão da empresa (para uso no PDV)
    @Column(name = "chave_pix", length = 255)
    private String chavePix;

    /** E-mail de suporte exibido na tela Suporte (por empresa). */
    @Column(name = "suporte_email", length = 255)
    private String suporteEmail;

    /** WhatsApp de suporte (apenas dígitos ou texto livre; normalizado no cliente). */
    @Column(name = "suporte_whatsapp", length = 32)
    private String suporteWhatsapp;

    /** Segmentacao de negocio (ex.: FARMACIA) para habilitar regras especificas. */
    @Column(name = "segmento", length = 40)
    private String segmento;

    @Column(name = "modulo_farmacia_ativo")
    private Boolean moduloFarmaciaAtivo = false;

    @Column(name = "farmacia_lote_validade_obrigatorio")
    private Boolean farmaciaLoteValidadeObrigatorio = false;

    @Column(name = "farmacia_controlados_ativo")
    private Boolean farmaciaControladosAtivo = false;

    @Column(name = "farmacia_antimicrobianos_ativo")
    private Boolean farmaciaAntimicrobianosAtivo = false;

    @Column(name = "farmacia_pmc_ativo")
    private Boolean farmaciaPmcAtivo = false;

    /** Politica de PMC: ALERTA ou BLOQUEIO. */
    @Column(name = "farmacia_pmc_modo", length = 20)
    private String farmaciaPmcModo = "ALERTA";

    @Column(name = "modulo_informatica_ativo")
    private Boolean moduloInformaticaAtivo = false;

    /** Endereço (logradouro) para cabeçalho da impressão da OS. */
    @Column(name = "endereco_linha1_os", length = 500)
    private String enderecoLinha1Os;

    @Column(name = "cidade_uf_os", length = 200)
    private String cidadeUfOs;

    @Column(name = "cnpj", length = 24)
    private String cnpj;

    @Column(name = "inscricao_municipal", length = 40)
    private String inscricaoMunicipal;

    @Column(name = "telefone_comercial", length = 40)
    private String telefoneComercial;

    @Column(name = "fax", length = 40)
    private String fax;

    @Column(name = "email_comercial", length = 255)
    private String emailComercial;

    /** Texto legal do rodapé da OS; se vazio, o cliente usa texto padrão na impressão. */
    @Column(name = "texto_termos_os", columnDefinition = "TEXT")
    private String textoTermosOs;

    @Column(name = "ativo")
    private Boolean ativo = true;
}
