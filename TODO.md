# TODO - Sistema de Perfis de Usuário

## ✅ Concluído - Backend REST API

### Backend - Spring Boot (Concluído)
- [x] Configuração do projeto (pom.xml)
- [x] application.properties - DB MySQL "athos", JWT config
- [x] Model: Role.java (enum ADM/VENDEDOR)
- [x] Model: Usuario.java (entity)
- [x] Model: Cliente.java (entity)
- [x] Model: Produto.java (entity)
- [x] Repository: UsuarioRepository.java
- [x] Repository: ClienteRepository.java
- [x] Repository: ProdutoRepository.java
- [x] DTOs: LoginRequest, LoginResponse, RegisterRequest, ClienteRequest, ClienteResponse, ProdutoRequest, ProdutoResponse
- [x] Security: JwtUtil.java, JwtAuthenticationFilter.java
- [x] Config: SecurityConfig.java, CorsConfig.java
- [x] Service: UsuarioService.java
- [x] Service: ClienteService.java
- [x] Service: ProdutoService.java
- [x] Controller: AuthController.java (login, register, users CRUD)
- [x] Controller: ClienteController.java
- [x] Controller: ProdutoController.java
- [x] Compilação bem-sucedida

### API Endpoints
- POST /api/auth/login - Login
- POST /api/auth/register - Cadastro
- GET /api/auth/users - Listar usuários (ADM)
- DELETE /api/auth/users/{id} - Excluir usuário (ADM)
- GET /api/auth/me - Usuário atual

- GET/POST /api/clientes - Clientes (ADM/VENDEDOR)
- PUT/DELETE /api/clientes/{id} - Clientes (ADM apenas delete)
- GET /api/clientes/search?q= - Buscar

- GET/POST /api/produtos - Produtos (ADM cria)
- PUT/DELETE /api/produtos/{id} - Produtos (ADM)
- GET /api/produtos/search?q= - Buscar
- GET /api/produtos/categoria/{cat} - Por categoria

---

## ⏳ Pendente - Frontend

### Frontend - HTML/JS (Pendente)
- [x] login.html + login.js - Integrar com API REST ✅ Concluído
- [x] auth.js - Atualizar para usar API ✅ Concluído
- [x] usuarios.html + usuarios.js - Apenas ADM ✅ Concluído
- [x] produtos.html + produtos.js - Apenas ADM ✅ Concluído
- [x] index.html + script.js - Apenas ADM (Clientes) ✅ Concluído - Integração API
- [x] vendas.html + vendas.js - ADM e Vendedor ✅ Concluído
- [x] Desconto na tela de Vendas (PDV) ✅ Concluído
- [x] Busca por CEP na tela de Clientes ✅ Concluído
- [x] Rate Limiting (proteção contra ataques de força bruta) ✅ Concluído
- [x] Headers de Segurança (HSTS, X-Frame-Options, etc) ✅ Concluído
- [x] Baixa de estoque ao realizar venda (PDV) ✅ Concluído
- [ ] relatorios.html + relatorios.js - Relatórios ❌ Pendente - Integração API

---

## ✅ Sistema Completo - Testes Realizados

### Testes Concluídos com Sucesso:
- ✅ Login e Cadastro de Usuário
- ✅ Cadastro de Cliente via API
- ✅ Listar clientes
- ✅ Validação de formulários
- ✅ Editar cliente
- ✅ Excluir cliente
- ✅ Buscar cliente
- ✅ Cadastrar produto (página Produtos)
- ✅ Listar produtos
- ✅ Editar produto
- ✅ Excluir produto

---

**Status: Backend completo, iniciando integração frontend**

