package com.sistema.cadastro;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

/**
 * Exclui {@link UserDetailsServiceAutoConfiguration}: autenticação é JWT + {@code Usuario} no filtro;
 * evita senha aleatória e WARN em produção.
 */
@SpringBootApplication(exclude = { UserDetailsServiceAutoConfiguration.class })
public class SistemaCadastroApplication {

    public static void main(String[] args) {
        SpringApplication.run(SistemaCadastroApplication.class, args);
    }
}
