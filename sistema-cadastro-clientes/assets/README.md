# Padrao de Assets

Organizacao de arquivos de midia do frontend:

- `assets/images/`: imagens de telas, logos de clientes e banners (`.png`, `.jpg`, `.webp`).
- `assets/icons/`: icones de app/PWA/favicon (`app-icon-192.png`, `app-icon-512.png`, `app-icon.svg`).

## Convencao de nomes

- usar minusculas e hifen: `logo-principal.png`
- evitar espacos e acentos
- manter extensao coerente com o formato real

## Compatibilidade

O `server-estatico.js` tem fallback para caminhos legados na raiz (`/sp.png`, por exemplo),
redirecionando internamente para `assets/images/` ou `assets/icons/`.
