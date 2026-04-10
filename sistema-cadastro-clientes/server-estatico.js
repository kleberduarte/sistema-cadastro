/**
 * Servidor estático (Node). /login → login.html.
 * Porta: tenta PORT (padrão 5500); se ocupada, tenta a próxima até PORT+40.
 * Grava ULTIMA_URL_FRONT.txt para você sempre saber o endereço certo.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT = path.resolve(__dirname);
const BASE_PORT = parseInt(process.env.PORT || '5500', 10);
const MAX_TRIES = parseInt(process.env.PORT_MAX_TRIES || '40', 10);
const STRICT = process.env.STRICT_PORT === '1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

function safePath(rel) {
  const full = path.normalize(path.join(ROOT, rel));
  if (!full.startsWith(ROOT)) return null;
  return full;
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Arquivo não encontrado');
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function tryResolveLegacyAssetPath(pathname, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico'].includes(ext)) {
    return null;
  }
  // Compatibilidade: arquivos antigos na raiz agora vivem em assets/images ou assets/icons.
  if (pathname.indexOf('/') !== pathname.lastIndexOf('/')) {
    return null; // só tenta para /arquivo.ext na raiz
  }
  const baseName = path.basename(filePath);
  const candidates = [
    safePath(path.join('assets', 'images', baseName)),
    safePath(path.join('assets', 'icons', baseName)),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch (_) {
      // ignora e tenta próximo caminho
    }
  }
  return null;
}

function handleRequest(req, res) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url || '/', 'http://x').pathname);
  } catch {
    res.writeHead(400);
    return res.end('URL inválida');
  }
  if (pathname.indexOf('..') !== -1) {
    res.writeHead(403);
    return res.end('Acesso negado');
  }

  if (pathname === '/login' || pathname === '/login/') pathname = '/login.html';
  if (pathname === '/' || pathname === '') pathname = '/index.html';

  const rel = pathname.replace(/^\/+/, '');
  const filePath = safePath(rel);

  if (!filePath) {
    res.writeHead(403);
    return res.end('Acesso negado');
  }

  fs.stat(filePath, (err, st) => {
    if (err) {
      const fallback = tryResolveLegacyAssetPath(pathname, filePath);
      if (fallback) {
        return sendFile(res, fallback);
      }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Não encontrado: ' + pathname);
    }
    if (st.isDirectory()) {
      const idx = path.join(filePath, 'index.html');
      fs.access(idx, fs.constants.R_OK, (e2) => {
        if (e2) {
          res.writeHead(404);
          return res.end('Pasta sem index.html');
        }
        sendFile(res, idx);
      });
      return;
    }
    sendFile(res, filePath);
  });
}

function gravarArquivosPorta(port) {
  const loginUrl = 'http://127.0.0.1:' + port + '/login.html';
  const dir = ROOT;
  try {
    fs.writeFileSync(path.join(dir, 'ULTIMA_URL_FRONT.txt'), loginUrl + '\r\n', 'utf8');
    fs.writeFileSync(path.join(dir, 'PORTA_FRONT.txt'), String(port) + '\r\n', 'utf8');
  } catch (e) {
    console.warn('Não foi possível gravar ULTIMA_URL_FRONT.txt:', e.message);
  }
}

function listenOnPort(port) {
  const server = http.createServer(handleRequest);

  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      if (STRICT) {
        console.error('  Porta ' + port + ' ocupada. Use outra porta ou feche o processo (STRICT_PORT=1).');
        process.exit(1);
        return;
      }
      const next = port + 1;
      if (next <= BASE_PORT + MAX_TRIES) {
        console.log('  Porta ' + port + ' ocupada, tentando ' + next + '...');
        listenOnPort(next);
      } else {
        console.error('');
        console.error('  ERRO: nenhuma porta livre entre ' + BASE_PORT + ' e ' + (BASE_PORT + MAX_TRIES) + '.');
        console.error('  Feche Live Server / outros node, ou: set PORT=5600');
        console.error('');
        process.exit(1);
      }
    } else {
      console.error(err);
      process.exit(1);
    }
  });

  server.listen(port, '0.0.0.0', () => {
    gravarArquivosPorta(port);
    console.log('');
    console.log('  ============================================');
    console.log('  FRONT:  http://127.0.0.1:' + port + '/login.html');
    console.log('  API:    http://localhost:8080');
    console.log('  (URL copiada em ULTIMA_URL_FRONT.txt nesta pasta)');
    console.log('  ============================================');
    console.log('');
  });
}

listenOnPort(BASE_PORT);
