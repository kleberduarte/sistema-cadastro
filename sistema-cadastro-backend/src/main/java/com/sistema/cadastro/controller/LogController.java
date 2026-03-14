package com.sistema.cadastro.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/logs")
@CrossOrigin(origins = "*")
public class LogController {

    @PostMapping
    public ResponseEntity<Void> receberLog(@RequestBody Map<String, Object> logData) {
        // Exibe o log no console do seu ambiente de desenvolvimento
        System.out.println("\n[AUDITORIA] Usuario: " + logData.get("usuario"));
        System.out.println("Acao: " + logData.get("acao"));
        System.out.println("Detalhes: " + logData.get("detalhes"));
        System.out.println("------------------------------------------");
        return ResponseEntity.ok().build();
    }
}