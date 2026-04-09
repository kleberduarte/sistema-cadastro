package com.sistema.cadastro.service;

import com.sistema.cadastro.model.PdvTerminal;
import com.sistema.cadastro.model.Usuario;
import com.sistema.cadastro.model.Venda;
import com.sistema.cadastro.repository.ClienteRepository;
import com.sistema.cadastro.repository.FechamentoCaixaRepository;
import com.sistema.cadastro.repository.PdvConvitePorEmpresaRepository;
import com.sistema.cadastro.repository.PdvTerminalRepository;
import com.sistema.cadastro.repository.ProdutoRepository;
import com.sistema.cadastro.repository.OrdemServicoRepository;
import com.sistema.cadastro.repository.UsuarioRepository;
import com.sistema.cadastro.repository.VendaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Remove todos os dados multi-tenant vinculados a um {@code empresaId} antes de apagar
 * {@link com.sistema.cadastro.model.ParametroEmpresa}; evita produtos/clientes/vendas órfãos
 * e reutilização de ID com dados antigos.
 */
@Service
@RequiredArgsConstructor
public class EmpresaTenantExclusaoService {

    private final VendaRepository vendaRepository;
    private final FechamentoCaixaRepository fechamentoCaixaRepository;
    private final PdvTerminalRepository pdvTerminalRepository;
    private final UsuarioRepository usuarioRepository;
    private final ProdutoRepository produtoRepository;
    private final ClienteRepository clienteRepository;
    private final PdvConvitePorEmpresaRepository pdvConvitePorEmpresaRepository;
    private final OrdemServicoRepository ordemServicoRepository;

    @Transactional
    public void excluirTodosDadosDoTenant(Long empresaId) {
        if (empresaId == null || empresaId < 1) {
            return;
        }

        List<Venda> vendas = vendaRepository.findByEmpresaId(empresaId);
        vendaRepository.deleteAll(vendas);
        ordemServicoRepository.deleteAll(ordemServicoRepository.findByEmpresaIdOrderByDataAberturaDesc(empresaId));

        fechamentoCaixaRepository.deleteAll(fechamentoCaixaRepository.findByEmpresaId(empresaId));

        List<PdvTerminal> terminais = pdvTerminalRepository.findByEmpresaIdOrderByCodigoAsc(empresaId);
        for (PdvTerminal t : terminais) {
            List<Usuario> vinculados = usuarioRepository.findByPdvTerminalId(t.getId());
            for (Usuario u : vinculados) {
                u.setPdvTerminalId(null);
                usuarioRepository.save(u);
            }
        }
        pdvTerminalRepository.deleteAll(terminais);

        produtoRepository.deleteAllDirectByEmpresaId(empresaId);

        clienteRepository.deleteAll(clienteRepository.findByEmpresaId(empresaId));

        pdvConvitePorEmpresaRepository.findById(empresaId).ifPresent(pdvConvitePorEmpresaRepository::delete);

        usuarioRepository.deleteAll(usuarioRepository.findByEmpresaId(empresaId));
    }
}
