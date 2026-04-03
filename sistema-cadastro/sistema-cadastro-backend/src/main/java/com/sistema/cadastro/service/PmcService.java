package com.sistema.cadastro.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sistema.cadastro.dto.PmcImportItemDTO;
import com.sistema.cadastro.model.PmcReferencia;
import com.sistema.cadastro.model.Produto;
import com.sistema.cadastro.model.Usuario;
import com.sistema.cadastro.repository.PmcReferenciaRepository;
import com.sistema.cadastro.repository.ProdutoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;

@Service
@RequiredArgsConstructor
@Slf4j
public class PmcService {
    private static final Pattern PAGE_PARAM_PATTERN = Pattern.compile("(^|&)pagina=[^&]*");
    private final EmpresaScopeService empresaScopeService;
    private final PmcReferenciaRepository pmcReferenciaRepository;
    private final ProdutoRepository produtoRepository;
    private final FarmaciaSupportService farmaciaSupportService;
    private final ObjectMapper objectMapper;
    @Value("${app.pmc.sync.enabled:false}")
    private boolean pmcSyncEnabled;
    @Value("${app.pmc.sync.url:}")
    private String pmcSyncUrl;
    @Value("${app.pmc.sync.auth-header:Authorization}")
    private String pmcSyncAuthHeader;
    @Value("${app.pmc.sync.token:}")
    private String pmcSyncToken;
    @Value("${app.pmc.sync.token-prefix:Bearer }")
    private String pmcSyncTokenPrefix;
    @Value("${app.pmc.sync.format:auto}")
    private String pmcSyncFormat;
    @Value("${app.pmc.sync.method:GET}")
    private String pmcSyncMethod;
    @Value("${app.pmc.sync.post-body:}")
    private String pmcSyncPostBody;

    @Transactional
    public Map<String, Object> importCsv(MultipartFile file, Usuario u, Long empresaIdParam) {
        long empresaId = empresaScopeService.resolveForWrite(u, empresaIdParam);
        List<PmcImportItemDTO> itens = parseCsv(file);
        int criados = 0;
        for (PmcImportItemDTO i : itens) {
            PmcReferencia p = new PmcReferencia();
            p.setEmpresaId(empresaId);
            p.setRegistroMs(i.getRegistroMs());
            p.setGtinEan(i.getGtinEan());
            p.setDescricao(i.getDescricao());
            p.setPmc(i.getPmc());
            p.setVigenciaInicio(i.getVigenciaInicio() != null ? i.getVigenciaInicio() : LocalDate.now());
            p.setVigenciaFim(i.getVigenciaFim());
            pmcReferenciaRepository.save(p);
            criados++;
        }
        int produtosAtualizados = atualizarPmcSnapshotProdutos(empresaId, itens);
        farmaciaSupportService.audit(empresaId, u.getId(), "PMC_IMPORT", "PMC_REFERENCIA", null,
                "itens=" + criados + ", produtosAtualizados=" + produtosAtualizados);
        Map<String, Object> out = new HashMap<>();
        out.put("empresaId", empresaId);
        out.put("importados", criados);
        out.put("pmcProdutosAtualizados", produtosAtualizados);
        return out;
    }

    @Transactional
    public Map<String, Object> importCsvBytes(byte[] fileBytes, Long empresaId, Long actorUserId, String auditEventName) {
        List<PmcImportItemDTO> itens = parseCsvStream(new ByteArrayInputStream(fileBytes));
        int criados = 0;
        for (PmcImportItemDTO i : itens) {
            PmcReferencia p = new PmcReferencia();
            p.setEmpresaId(empresaId);
            p.setRegistroMs(i.getRegistroMs());
            p.setGtinEan(i.getGtinEan());
            p.setDescricao(i.getDescricao());
            p.setPmc(i.getPmc());
            p.setVigenciaInicio(i.getVigenciaInicio() != null ? i.getVigenciaInicio() : LocalDate.now());
            p.setVigenciaFim(i.getVigenciaFim());
            pmcReferenciaRepository.save(p);
            criados++;
        }
        int produtosAtualizados = atualizarPmcSnapshotProdutos(empresaId, itens);
        farmaciaSupportService.audit(empresaId, actorUserId, auditEventName, "PMC_REFERENCIA", null,
                "itens=" + criados + ", produtosAtualizados=" + produtosAtualizados);
        Map<String, Object> out = new HashMap<>();
        out.put("empresaId", empresaId);
        out.put("importados", criados);
        out.put("pmcProdutosAtualizados", produtosAtualizados);
        return out;
    }

    @Transactional
    public Map<String, Object> syncFromConfiguredSourceForEmpresa(Long empresaId, Long actorUserId) {
        return syncFromConfiguredSourceInternal(empresaId, actorUserId, true, "PMC_IMPORT_AUTO");
    }

    @Transactional
    public Map<String, Object> syncManualFromConfiguredSourceForEmpresa(Long empresaId, Long actorUserId) {
        return syncFromConfiguredSourceInternal(empresaId, actorUserId, false, "PMC_IMPORT_MANUAL");
    }

    private Map<String, Object> syncFromConfiguredSourceInternal(Long empresaId,
                                                                 Long actorUserId,
                                                                 boolean requireEnabledFlag,
                                                                 String auditEventName) {
        if (requireEnabledFlag && !pmcSyncEnabled) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sincronização automática de PMC está desativada.");
        }
        if (isBlank(pmcSyncUrl)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "URL da fonte PMC não configurada.");
        }
        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest.Builder builder = HttpRequest.newBuilder().uri(URI.create(pmcSyncUrl.trim()));
            if (!isBlank(pmcSyncToken)) {
                builder.header(pmcSyncAuthHeader, (pmcSyncTokenPrefix == null ? "" : pmcSyncTokenPrefix) + pmcSyncToken.trim());
            }
            String method = isBlank(pmcSyncMethod) ? "GET" : pmcSyncMethod.trim().toUpperCase();
            String format = isBlank(pmcSyncFormat) ? "AUTO" : pmcSyncFormat.trim().toUpperCase();
            // ABC Farma: POST + JSON paginado (total_paginas/data); consolidamos todas as páginas.
            if ("JSON".equals(format) && "POST".equals(method)) {
                return syncJsonPagedFromConfiguredSource(client, builder, empresaId, actorUserId, auditEventName);
            }
            if ("POST".equals(method)) {
                String body = isBlank(pmcSyncPostBody) ? "" : pmcSyncPostBody;
                if (!isBlank(body)) {
                    builder.header("Content-Type", "application/x-www-form-urlencoded");
                }
                builder.POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8));
            } else {
                builder.GET();
            }
            HttpResponse<byte[]> response = client.send(builder.build(), HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Falha ao baixar base PMC: HTTP " + response.statusCode());
            }
            byte[] body = response.body();
            if (body == null || body.length == 0) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Fonte PMC retornou arquivo vazio.");
            }
            String contentType = response.headers().firstValue("Content-Type").orElse("");
            return importFromRemotePayload(body, contentType, empresaId, actorUserId, auditEventName);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("Erro no sync automático PMC (empresa {}): {}", empresaId, e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Erro ao sincronizar PMC automaticamente: " + e.getMessage());
        }
    }

    private Map<String, Object> syncJsonPagedFromConfiguredSource(HttpClient client,
                                                                   HttpRequest.Builder baseBuilder,
                                                                   Long empresaId,
                                                                   Long actorUserId,
                                                                   String auditEventName) throws Exception {
        String baseBody = isBlank(pmcSyncPostBody) ? "" : pmcSyncPostBody;
        if (!isBlank(baseBody)) {
            baseBuilder.header("Content-Type", "application/x-www-form-urlencoded");
        }

        List<PmcImportItemDTO> all = new ArrayList<>();
        int totalPaginas = 1;
        int pagina = 1;
        while (pagina <= totalPaginas) {
            String reqBody = withPage(baseBody, pagina);
            HttpRequest req = baseBuilder.copy()
                    .POST(HttpRequest.BodyPublishers.ofString(reqBody, StandardCharsets.UTF_8))
                    .build();
            HttpResponse<byte[]> response = client.send(req, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Falha ao baixar base PMC: HTTP " + response.statusCode());
            }
            byte[] payload = response.body();
            if (payload == null || payload.length == 0) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Fonte PMC retornou arquivo vazio.");
            }

            JsonNode root = objectMapper.readTree(payload);
            if (pagina == 1) {
                totalPaginas = parseTotalPaginas(root);
                if (totalPaginas < 1) totalPaginas = 1;
            }
            walkJson(root, all);
            pagina++;
        }
        return persistItens(all, empresaId, actorUserId, auditEventName);
    }

    private int parseTotalPaginas(JsonNode root) {
        if (root == null || root.isNull()) return 1;
        JsonNode n = root.get("total_paginas");
        if (n == null || n.isNull()) return 1;
        try {
            return n.isNumber() ? n.asInt() : Integer.parseInt(n.asText().trim());
        } catch (Exception e) {
            return 1;
        }
    }

    private String withPage(String body, int page) {
        String clean = body == null ? "" : body.trim();
        String pageParam = "pagina=" + page;
        if (clean.isEmpty()) return pageParam;
        if (PAGE_PARAM_PATTERN.matcher(clean).find()) {
            return PAGE_PARAM_PATTERN.matcher(clean).replaceAll("$1" + pageParam);
        }
        return clean + "&" + pageParam;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> relatorioConformidade(Usuario u, Long empresaIdParam) {
        Optional<Long> scope = empresaScopeService.resolveForList(u, empresaIdParam);
        Long empresaId = scope.orElse(null);
        if (empresaId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe empresaId para relatório PMC.");
        }
        List<Produto> produtos = produtoRepository.findByEmpresaId(empresaId);
        int semChave = 0;
        for (Produto p : produtos) {
            if (isBlank(p.getRegistroMs()) && isBlank(p.getGtinEan())) semChave++;
        }
        Map<String, Object> out = new HashMap<>();
        out.put("empresaId", empresaId);
        out.put("produtosTotal", produtos.size());
        out.put("produtosSemChaveRegulatoria", semChave);
        out.put("ultimaAtualizacao", pmcReferenciaRepository.findTopByEmpresaIdOrderByCreatedAtDesc(empresaId).map(PmcReferencia::getCreatedAt).orElse(null));
        return out;
    }

    private List<PmcImportItemDTO> parseCsv(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Arquivo PMC não enviado.");
        }
        try {
            return parseCsvStream(file.getInputStream());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Falha ao ler CSV PMC: " + e.getMessage());
        }
    }

    private List<PmcImportItemDTO> parseCsvStream(java.io.InputStream stream) {
        List<PmcImportItemDTO> out = new ArrayList<>();
        try (BufferedReader br = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String head = br.readLine();
            if (head == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CSV PMC vazio.");
            String delimiter = head.contains(";") ? ";" : ",";
            Map<String, Integer> idx = new HashMap<>();
            String[] h = head.split(delimiter, -1);
            for (int i = 0; i < h.length; i++) idx.put(norm(h[i]), i);
            String line;
            while ((line = br.readLine()) != null) {
                if (line.trim().isEmpty()) continue;
                String[] c = line.split(delimiter, -1);
                PmcImportItemDTO dto = new PmcImportItemDTO();
                dto.setRegistroMs(get(c, idx, "registro_ms"));
                dto.setGtinEan(get(c, idx, "gtin_ean"));
                dto.setDescricao(get(c, idx, "descricao"));
                String pmc = get(c, idx, "pmc");
                if (pmc == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Coluna pmc obrigatória.");
                dto.setPmc(parseMoney(pmc));
                String ini = get(c, idx, "vigencia_inicio");
                dto.setVigenciaInicio(ini == null ? LocalDate.now() : LocalDate.parse(ini));
                String fim = get(c, idx, "vigencia_fim");
                dto.setVigenciaFim(isBlank(fim) ? null : LocalDate.parse(fim));
                out.add(dto);
            }
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Falha ao ler CSV PMC: " + e.getMessage());
        }
        return out;
    }

    private Map<String, Object> importFromRemotePayload(byte[] body,
                                                        String contentType,
                                                        Long empresaId,
                                                        Long actorUserId,
                                                        String auditEventName) {
        String fmt = isBlank(pmcSyncFormat) ? "AUTO" : pmcSyncFormat.trim().toUpperCase();
        boolean jsonByContent = !isBlank(contentType) && contentType.toLowerCase().contains("json");
        boolean useJson = "JSON".equals(fmt) || ("AUTO".equals(fmt) && jsonByContent);
        if (!useJson) {
            // fallback por tentativa quando AUTO e content-type não ajuda
            if ("AUTO".equals(fmt)) {
                String sample = new String(body, 0, Math.min(body.length, 32), StandardCharsets.UTF_8).trim();
                if (sample.startsWith("{") || sample.startsWith("[")) useJson = true;
            }
        }
        if (useJson) {
            List<PmcImportItemDTO> itens = parseJsonBytes(body);
            return persistItens(itens, empresaId, actorUserId, auditEventName);
        }
        return importCsvBytes(body, empresaId, actorUserId, auditEventName);
    }

    private List<PmcImportItemDTO> parseJsonBytes(byte[] body) {
        try {
            JsonNode root = objectMapper.readTree(body);
            List<PmcImportItemDTO> out = new ArrayList<>();
            walkJson(root, out);
            if (out.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "JSON PMC sem itens reconhecidos (campos registro/gtin + pmc).");
            }
            return out;
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Falha ao ler JSON PMC: " + e.getMessage());
        }
    }

    private void walkJson(JsonNode node, List<PmcImportItemDTO> out) {
        if (node == null || node.isNull()) return;
        if (node.isArray()) {
            for (JsonNode child : node) walkJson(child, out);
            return;
        }
        if (!node.isObject()) return;

        PmcImportItemDTO dto = toPmcItem(node);
        if (dto != null) out.add(dto);

        node.fields().forEachRemaining(e -> {
            JsonNode child = e.getValue();
            if (child != null && (child.isArray() || child.isObject())) walkJson(child, out);
        });
    }

    private PmcImportItemDTO toPmcItem(JsonNode node) {
        String registro = firstText(node, "registro_ms", "registroMS", "registro", "registroMs", "REGISTRO_ANVISA");
        String gtin = firstText(node, "gtin_ean", "gtinEan", "gtin", "ean", "EAN", "EAN1");
        BigDecimal pmc = firstMoney(node, "pmc", "PMC", "PMC_20", "PMC20", "pmc_20", "pmc20");
        if (pmc == null) return null;
        if (isBlank(registro) && isBlank(gtin)) return null;

        PmcImportItemDTO dto = new PmcImportItemDTO();
        dto.setRegistroMs(isBlank(registro) ? null : registro.trim());
        dto.setGtinEan(isBlank(gtin) ? null : gtin.trim());
        dto.setDescricao(firstText(node, "descricao", "descricao_produto", "nome", "produto"));
        dto.setPmc(pmc);
        String ini = firstText(node, "vigencia_inicio", "vigenciaInicio", "inicio_vigencia");
        String fim = firstText(node, "vigencia_fim", "vigenciaFim", "fim_vigencia");
        dto.setVigenciaInicio(isBlank(ini) ? LocalDate.now() : LocalDate.parse(ini.trim()));
        dto.setVigenciaFim(isBlank(fim) ? null : LocalDate.parse(fim.trim()));
        return dto;
    }

    private String firstText(JsonNode n, String... keys) {
        for (String k : keys) {
            JsonNode v = n.get(k);
            if (v == null || v.isNull()) continue;
            String s = v.isTextual() ? v.asText() : v.toString();
            if (!isBlank(s)) return s.trim().replace("\"", "");
        }
        return null;
    }

    private BigDecimal firstMoney(JsonNode n, String... keys) {
        for (String k : keys) {
            JsonNode v = n.get(k);
            if (v == null || v.isNull()) continue;
            try {
                if (v.isNumber()) return v.decimalValue();
                String s = v.asText();
                if (!isBlank(s)) return parseMoney(s);
            } catch (Exception ignored) {}
        }
        return null;
    }

    private Map<String, Object> persistItens(List<PmcImportItemDTO> itens,
                                             Long empresaId,
                                             Long actorUserId,
                                             String auditEventName) {
        int criados = 0;
        for (PmcImportItemDTO i : itens) {
            PmcReferencia p = new PmcReferencia();
            p.setEmpresaId(empresaId);
            p.setRegistroMs(i.getRegistroMs());
            p.setGtinEan(i.getGtinEan());
            p.setDescricao(i.getDescricao());
            p.setPmc(i.getPmc());
            p.setVigenciaInicio(i.getVigenciaInicio() != null ? i.getVigenciaInicio() : LocalDate.now());
            p.setVigenciaFim(i.getVigenciaFim());
            pmcReferenciaRepository.save(p);
            criados++;
        }
        int produtosAtualizados = atualizarPmcSnapshotProdutos(empresaId, itens);
        farmaciaSupportService.audit(empresaId, actorUserId, auditEventName, "PMC_REFERENCIA", null,
                "itens=" + criados + ", produtosAtualizados=" + produtosAtualizados);
        Map<String, Object> out = new HashMap<>();
        out.put("empresaId", empresaId);
        out.put("importados", criados);
        out.put("pmcProdutosAtualizados", produtosAtualizados);
        return out;
    }

    private static String norm(String s) {
        if (s == null) return "";
        return s.trim().toLowerCase().replace(" ", "_");
    }

    private static String get(String[] c, Map<String, Integer> idx, String key) {
        Integer i = idx.get(key);
        if (i == null || i < 0 || i >= c.length) return null;
        String v = c[i] == null ? null : c[i].trim();
        return isBlank(v) ? null : v;
    }

    private static BigDecimal parseMoney(String in) {
        String v = in == null ? "" : in.trim();
        if (v.isEmpty()) throw new IllegalArgumentException("Valor PMC vazio");

        // Aceita formatos "1.234,56" e "1234.56" sem distorcer casas decimais.
        if (v.contains(",") && v.contains(".")) {
            v = v.replace(".", "").replace(",", ".");
        } else if (v.contains(",")) {
            v = v.replace(",", ".");
        }
        return new BigDecimal(v);
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private int atualizarPmcSnapshotProdutos(Long empresaId, List<PmcImportItemDTO> itens) {
        if (itens == null || itens.isEmpty()) return 0;

        List<Produto> produtos = produtoRepository.findByEmpresaId(empresaId);
        if (produtos.isEmpty()) return 0;

        Map<String, BigDecimal> pmcPorRegistro = new HashMap<>();
        Map<String, BigDecimal> pmcPorGtin = new HashMap<>();
        for (PmcImportItemDTO i : itens) {
            if (i == null || i.getPmc() == null) continue;
            if (!isBlank(i.getRegistroMs())) pmcPorRegistro.put(i.getRegistroMs().trim(), i.getPmc());
            if (!isBlank(i.getGtinEan())) pmcPorGtin.put(i.getGtinEan().trim(), i.getPmc());
        }
        if (pmcPorRegistro.isEmpty() && pmcPorGtin.isEmpty()) return 0;

        int atualizados = 0;
        Set<Long> idsAtualizados = new HashSet<>();
        for (Produto p : produtos) {
            BigDecimal novoPmc = null;
            if (!isBlank(p.getRegistroMs())) novoPmc = pmcPorRegistro.get(p.getRegistroMs().trim());
            if (novoPmc == null && !isBlank(p.getGtinEan())) novoPmc = pmcPorGtin.get(p.getGtinEan().trim());
            if (novoPmc == null) continue;
            if (p.getPmc() != null && p.getPmc().compareTo(novoPmc) == 0) continue;

            p.setPmc(novoPmc);
            if (p.getId() != null && idsAtualizados.add(p.getId())) atualizados++;
        }
        if (atualizados > 0) produtoRepository.saveAll(produtos);
        return atualizados;
    }
}

