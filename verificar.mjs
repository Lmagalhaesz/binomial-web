// Verificação end-to-end: serve os arquivos, abre no Chrome headless via CDP,
// interage com o formulário e confere o DOM. Sem dependências externas.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, join } from 'node:path';

const RAIZ = process.cwd();
const CHROME = '/Users/leonardomagalhaes/.cache/puppeteer/chrome-headless-shell/mac_arm-152.0.7977.54/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const TIPOS = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css' };

const srv = createServer(async (req, res) => {
  const p = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  try {
    const buf = await readFile(join(RAIZ, p));
    res.writeHead(200, { 'content-type': TIPOS[extname(p)] || 'text/plain' });
    res.end(buf);
  } catch { res.writeHead(404); res.end('404'); }
});
await new Promise(r => srv.listen(0, r));
const base = `http://127.0.0.1:${srv.address().port}/`;

const chrome = spawn(CHROME, ['--headless', '--remote-debugging-port=9333', '--disable-gpu', '--no-sandbox', 'about:blank']);
let alvos = null;
for (let i = 0; i < 40 && !alvos; i++) {
  await new Promise(r => setTimeout(r, 500));
  try { alvos = await (await fetch('http://127.0.0.1:9333/json/list')).json(); } catch {}
}
if (!alvos) { console.error('Chrome nao subiu'); process.exit(1); }
const ws = new WebSocket(alvos[0].webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));

let id = 0; const pend = new Map(); const erros = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') erros.push(JSON.stringify(m.params.exceptionDetails).slice(0, 300));
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') erros.push(JSON.stringify(m.params.args).slice(0, 300));
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') erros.push(m.params.entry.text + ' ' + (m.params.entry.url||''));
});
const cmd = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

await cmd('Runtime.enable'); await cmd('Log.enable'); await cmd('Page.enable');
await cmd('Page.navigate', { url: base });
await new Promise(r => setTimeout(r, 1200));

const evalJs = async (expr) => {
  const r = await cmd('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0,400));
  return r.result.result.value;
};

let falhas = 0;
const t = (nome, ok, extra='') => { if (ok) console.log('ok      ' + nome); else { falhas++; console.log('FALHOU  ' + nome + '  ' + extra); } };

// estado inicial (n=10, p=0.3, x=3)
let ind = await evalJs("document.getElementById('val-ind').textContent");
let acum = await evalJs("document.getElementById('val-acum').textContent");
t('render inicial P(X=3)=0.266828', ind === '0.266828', ind);
t('render inicial P(X<=3)=0.649611', acum === '0.649611', acum);
t('saida visivel', (await evalJs("!document.getElementById('saida').hidden")));
t('grafico tem 11 barras', (await evalJs("document.querySelectorAll('#grafico .barra').length")) === 11);
t('tabela tem 11 linhas', (await evalJs("document.querySelectorAll('#tbody tr').length")) === 11);
t('linha alvo marcada', (await evalJs("document.querySelectorAll('#tbody tr.alvo').length")) === 1);
t('passos preenchidos', (await evalJs("document.getElementById('passos').children.length")) === 10);

const setar = async (n, p, x) => evalJs(`(()=>{n.value='${n}';document.getElementById('p').value='${p}';x.value='${x}';document.getElementById('form').requestSubmit();return 1})()`);

// caso n grande — janela e ausência de NaN
await setar(1000, 0.5, 500);
ind = await evalJs("document.getElementById('val-ind').textContent");
t('n=1000 sem NaN', ind === '0.025225', ind);
t('n=1000 janela <= 80 barras', (await evalJs("document.querySelectorAll('#grafico .barra').length")) <= 80);
t('n=1000 x=500 aparece na tabela', (await evalJs("[...document.querySelectorAll('#tbody tr td:first-child')].some(td=>td.textContent==='500')")));
t('n=1000 nota de recorte', ((await evalJs("document.getElementById('nota-grafico').textContent")) || '').includes('Exibindo'));
t('n=1000 acumulada ~0.5126', (await evalJs("document.getElementById('val-acum').textContent")) === '0.512613', await evalJs("document.getElementById('val-acum').textContent"));

// bordas
await setar(8, 0, 0);
t('p=0 x=0 -> 1.000000', (await evalJs("document.getElementById('val-ind').textContent")) === '1.000000');
await setar(8, 1, 8);
t('p=1 x=8 -> 1.000000', (await evalJs("document.getElementById('val-ind').textContent")) === '1.000000');
await setar(0, 0.4, 0);
t('n=0 x=0 -> 1.000000', (await evalJs("document.getElementById('val-ind').textContent")) === '1.000000');

// erros de validação
await setar(5, 0.5, 9);
t('x>n mostra erro', !(await evalJs("document.getElementById('erro').hidden")));
t('x>n esconde saida', (await evalJs("document.getElementById('saida').hidden")));
await setar(5, 2, 1);
t('p>1 mostra erro', !(await evalJs("document.getElementById('erro').hidden")));
await setar(5, 0.5, 2);
t('recupera apos erro', (await evalJs("document.getElementById('val-ind').textContent")) === '0.312500' && (await evalJs("document.getElementById('erro').hidden")));

// probabilidade muito pequena -> notação científica
await setar(50, 0.5, 0);
t('valor minusculo em notacao cientifica', (await evalJs("document.getElementById('val-ind').textContent")).includes('e-'), await evalJs("document.getElementById('val-ind').textContent"));

// botão exemplo
await evalJs("document.getElementById('exemplo').click()");
t('botao exemplo restaura 0.266828', (await evalJs("document.getElementById('val-ind').textContent")) === '0.266828');

// nenhum overflow horizontal
t('sem scroll horizontal', (await evalJs("document.documentElement.scrollWidth <= window.innerWidth + 1")), await evalJs("document.documentElement.scrollWidth+'/'+window.innerWidth"));

t('sem erros de console', erros.length === 0, erros.join(' | '));

const shot = await cmd('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
await (await import('node:fs/promises')).writeFile('/tmp/binomial.png', Buffer.from(shot.result.data, 'base64'));

console.log(falhas === 0 ? '\nUI: TODOS OS TESTES PASSARAM' : `\nUI: ${falhas} FALHA(S)`);
ws.close(); chrome.kill(); srv.close();
process.exit(falhas ? 1 : 0);
