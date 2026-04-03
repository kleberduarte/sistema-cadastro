package com.sistema.cadastro.repository;

import com.sistema.cadastro.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByUsername(String username);
    boolean existsByUsername(String username);

    /**
     * Login: aceita o mesmo login com "." ou "_" (ex.: {@code julia.duarte} encontra {@code julia_duarte} no banco).
     * Ordem: exato → pontos como sublinhados → sublinhados como pontos.
     */
    default Optional<Usuario> findByUsernameLenient(String raw) {
        if (raw == null) {
            return Optional.empty();
        }
        String t = raw.trim();
        if (t.isEmpty()) {
            return Optional.empty();
        }
        Optional<Usuario> o = findByUsername(t);
        if (o.isPresent()) {
            return o;
        }
        String asUnderscore = t.replace('.', '_');
        if (!asUnderscore.equals(t)) {
            o = findByUsername(asUnderscore);
            if (o.isPresent()) {
                return o;
            }
        }
        String asDots = t.replace('_', '.');
        if (!asDots.equals(t)) {
            return findByUsername(asDots);
        }
        return Optional.empty();
    }
    List<Usuario> findByPdvTerminalId(Long pdvTerminalId);
    List<Usuario> findByEmpresaId(Long empresaId);
}
