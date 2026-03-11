package com.sistema.cadastro.service;

import com.sistema.cadastro.dto.ParametroEmpresaDTO;
import com.sistema.cadastro.model.ParametroEmpresa;
import com.sistema.cadastro.repository.ParametroEmpresaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ParametroEmpresaService {

    @Autowired
    private ParametroEmpresaRepository repository;

    @Transactional
    public ParametroEmpresaDTO salvar(ParametroEmpresaDTO dto) {
        ParametroEmpresa parametro;
        
        if (dto.getId() != null) {
            parametro = repository.findById(dto.getId())
                    .orElse(new ParametroEmpresa());
        } else {
            parametro = new ParametroEmpresa();
        }

        parametro.setEmpresaId(dto.getEmpresaId());
        parametro.setNomeEmpresa(dto.getNomeEmpresa());
        parametro.setLogoUrl(dto.getLogoUrl());
        parametro.setCorPrimaria(dto.getCorPrimaria());
        parametro.setCorSecundaria(dto.getCorSecundaria());
        parametro.setCorFundo(dto.getCorFundo());
        parametro.setCorTexto(dto.getCorTexto());
        parametro.setCorBotao(dto.getCorBotao());
        parametro.setCorBotaoTexto(dto.getCorBotaoTexto());
        parametro.setMensagemBoasVindas(dto.getMensagemBoasVindas());
        parametro.setAtivo(dto.getAtivo() == null ? true : dto.getAtivo());

        parametro = repository.save(parametro);
        return toDTO(parametro);
    }

    public Optional<ParametroEmpresaDTO> buscarPorEmpresaId(Long empresaId) {
        return repository.findByEmpresaIdAndAtivoTrue(empresaId)
                .map(this::toDTO);
    }

    public Optional<ParametroEmpresaDTO> buscarPorEmpresaIdComInativos(Long empresaId) {
        return repository.findByEmpresaId(empresaId)
                .map(this::toDTO);
    }

    public Optional<ParametroEmpresaDTO> buscarPorId(Long id) {
        return repository.findById(id)
                .map(this::toDTO);
    }

    public ParametroEmpresaDTO getParametrosAtivos() {
        return repository.findAll().stream()
                .filter(p -> p.getAtivo() != null && p.getAtivo())
                .findFirst()
                .map(this::toDTO)
                .orElse(getParametrosDefault());
    }

    public ParametroEmpresaDTO getParametrosDefault() {
        ParametroEmpresaDTO dto = new ParametroEmpresaDTO();
        dto.setNomeEmpresa("Sistema de Cadastro");
        dto.setCorPrimaria("#667eea");
        dto.setCorSecundaria("#764ba2");
        dto.setCorFundo("#ffffff");
        dto.setCorTexto("#333333");
        dto.setCorBotao("#667eea");
        dto.setCorBotaoTexto("#ffffff");
        dto.setAtivo(true);
        return dto;
    }

    @Transactional
    public void excluir(Long id) {
        repository.deleteById(id);
    }

    public List<ParametroEmpresaDTO> listarTodos() {
        return repository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    private ParametroEmpresaDTO toDTO(ParametroEmpresa entity) {
        ParametroEmpresaDTO dto = new ParametroEmpresaDTO();
        dto.setId(entity.getId());
        dto.setEmpresaId(entity.getEmpresaId());
        dto.setNomeEmpresa(entity.getNomeEmpresa());
        dto.setLogoUrl(entity.getLogoUrl());
        dto.setCorPrimaria(entity.getCorPrimaria());
        dto.setCorSecundaria(entity.getCorSecundaria());
        dto.setCorFundo(entity.getCorFundo());
        dto.setCorTexto(entity.getCorTexto());
        dto.setCorBotao(entity.getCorBotao());
        dto.setCorBotaoTexto(entity.getCorBotaoTexto());
        dto.setMensagemBoasVindas(entity.getMensagemBoasVindas());
        dto.setAtivo(entity.getAtivo());
        return dto;
    }
}

