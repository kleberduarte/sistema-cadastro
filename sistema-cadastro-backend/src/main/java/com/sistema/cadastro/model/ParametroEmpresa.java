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

    @Column(name = "ativo")
    private Boolean ativo = true;
}
