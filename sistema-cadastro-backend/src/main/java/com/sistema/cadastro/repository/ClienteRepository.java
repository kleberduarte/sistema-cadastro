package com.sistema.cadastro.repository;

import com.sistema.cadastro.model.Cliente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClienteRepository extends JpaRepository<Cliente, Long> {

    List<Cliente> findByEmpresaId(Long empresaId);

    Optional<Cliente> findByEmpresaIdAndCpf(Long empresaId, String cpf);

    Optional<Cliente> findByEmpresaIdAndEmail(Long empresaId, String email);

    boolean existsByEmpresaIdAndCpf(Long empresaId, String cpf);

    boolean existsByEmpresaIdAndEmail(Long empresaId, String email);

    @Query("""
            SELECT c FROM Cliente c
            WHERE (LOWER(c.nome) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
                OR LOWER(c.email) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
                OR c.cpf LIKE CONCAT('%', :searchTerm, '%'))
              AND (:empresaId IS NULL OR c.empresaId = :empresaId)
            """)
    List<Cliente> search(@Param("searchTerm") String searchTerm, @Param("empresaId") Long empresaId);

    // Legado / convite: manter busca por CPF global se necessário — evitar uso em novo código
    Optional<Cliente> findByCpf(String cpf);

    Optional<Cliente> findByEmail(String email);
}
