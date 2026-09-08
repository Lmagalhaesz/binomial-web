import {
  combinacoes, probabilidadeIndividual, probabilidadeAcumulada,
  distribuicao, resumo, validar,
} from './binomial.js';

const $ = (id) => document.getElementById(id);
const form = $('form');
const erroEl = $('erro');
const saida = $('saida');

/** Máximo de barras/linhas renderizadas — acima disso mostra uma janela central. */
const LIMITE_VISUAL = 80;

/** Notação científica quando o número é pequeno demais para 6 casas decimais. */
function fmt(v, casas = 6) {
  if (!Number.isFinite(v)) return '—';
  if (v !== 0 && Math.abs(v) < 1e-6) return v.toExponential(4);
  return v.toFixed(casas);
}

function fmtInt(v) {
  if (!Number.isFinite(v)) return '—';
  return Math.abs(v) > 1e15 ? v.toExponential(4) : v.toLocaleString('pt-BR');
}

const pct = (v) => (v * 100).toFixed(4).replace('.', ',') + '%';

function mostrarErro(msg) {
  erroEl.textContent = msg;
  erroEl.hidden = false;
  saida.hidden = true;
}

function calcular() {
  const n = Number.parseFloat($('n').value);
  const p = Number.parseFloat($('p').value);
  const x = Number.parseFloat($('x').value);

  if ([n, p, x].some((v) => Number.isNaN(v))) {
    return mostrarErro('Preencha n, p e x com números válidos.');
  }
  const problema = validar(n, p, x);
  if (problema) return mostrarErro(problema);

  erroEl.hidden = true;
  saida.hidden = false;

  const q = 1 - p;
  const pInd = probabilidadeIndividual(n, p, x);
  const pAcum = probabilidadeAcumulada(n, p, x);
  const c = combinacoes(n, x);

  // --- cartões ---
  $('expr-ind').textContent = `P(X = ${x})`;
  $('val-ind').textContent = fmt(pInd);
  $('pct-ind').textContent = pct(pInd);

  $('expr-acum').textContent = `P(X ≤ ${x})`;
  $('val-acum').textContent = fmt(pAcum);
  $('pct-acum').textContent = pct(pAcum);

  // --- passos ---
  const passos = [
    ['Dados', `n = ${n}   p = ${p}   q = 1 − p = ${fmt(q)}   x = ${x}`],
    ['Combinações', `C(${n},${x}) = ${n}! / (${x}! · ${n - x}!) = ${fmtInt(c)}`],
    ['Substituição', `P(${x}) = ${fmtInt(c)} · ${p}^${x} · ${fmt(q)}^${n - x}`],
    ['Individual — P(X = x)', `P(X = ${x}) = ${fmt(pInd, 8)}  =  ${pct(pInd)}`],
    ['Acumulada — P(X ≤ x)', `P(X ≤ ${x}) = ${somatorioTexto(n, p, x)} = ${fmt(pAcum, 8)}  =  ${pct(pAcum)}`],
  ];
  $('passos').innerHTML = passos
    .map(([rot, txt]) => `<p class="rotulo">${rot}</p><p>${escapar(txt)}</p>`)
    .join('');

  // --- medidas ---
  const { media, variancia, desvio } = resumo(n, p);
  const medidas = [
    ['P(X &lt; x)', fmt(pAcum - pInd)],
    ['P(X &gt; x)', fmt(Math.max(0, 1 - pAcum))],
    ['P(X ≥ x)', fmt(Math.min(1, 1 - pAcum + pInd))],
    ['Média  μ = n·p', fmt(media, 4)],
    ['Variância  σ² = n·p·q', fmt(variancia, 4)],
    ['Desvio padrão  σ', fmt(desvio, 4)],
  ];
  $('medidas').innerHTML = medidas.map(([dt, dd]) => `<div><dt>${dt}</dt><dd>${dd}</dd></div>`).join('');

  // --- gráfico + tabela ---
  const dist = distribuicao(n, p);
  const { inicio, fim } = janela(n, x, dist);

  const maior = Math.max(...dist.slice(inicio, fim + 1), Number.MIN_VALUE);
  $('grafico').innerHTML = Array.from({ length: fim - inicio + 1 }, (_, k) => {
    const i = inicio + k;
    const altura = Math.max((dist[i] / maior) * 100, 0.5);
    const classe = i === x ? 'alvo' : i < x ? 'acum' : '';
    const rotulo = (fim - inicio > 30 && i % 5 !== 0 && i !== x) ? '' : `<em>${i}</em>`;
    return `<div class="barra ${classe}" title="P(X = ${i}) = ${fmt(dist[i])}">` +
           `<i style="height:${altura}%"></i>${rotulo}</div>`;
  }).join('');

  let acumulado = inicio === 0 ? 0 : probabilidadeAcumulada(n, p, inicio - 1);
  const linhas = [];
  for (let i = inicio; i <= fim; i++) {
    acumulado = Math.min(1, acumulado + dist[i]);
    linhas.push(
      `<tr class="${i === x ? 'alvo' : ''}"><td>${i}</td><td>${fmtInt(combinacoes(n, i))}</td>` +
      `<td>${fmt(dist[i])}</td><td>${fmt(acumulado)}</td></tr>`
    );
  }
  $('tbody').innerHTML = linhas.join('');

  const recorte = (inicio > 0 || fim < n)
    ? `Exibindo x de ${inicio} a ${fim} (n = ${n}). Fora dessa faixa as probabilidades são desprezíveis.`
    : '';
  $('nota-grafico').textContent = recorte;
  $('nota-tabela').textContent = recorte;
}

/** Texto do somatório da acumulada, resumido quando há muitos termos. */
function somatorioTexto(n, p, x) {
  if (x === 0) return 'P(0)';
  if (x <= 5) return Array.from({ length: x + 1 }, (_, i) => `P(${i})`).join(' + ');
  return `P(0) + P(1) + … + P(${x})`;
}

/** Faixa de x renderizada: tudo, ou uma janela centrada onde há massa de probabilidade. */
function janela(n, x, dist) {
  if (n + 1 <= LIMITE_VISUAL) return { inicio: 0, fim: n };
  const meio = Math.round((n * dist.reduce((a, v, i) => a + v * i, 0)) / Math.max(n, 1) || 0);
  const centro = Math.min(n, Math.max(0, Math.round((meio + x) / 2)));
  const metade = Math.floor(LIMITE_VISUAL / 2);
  let inicio = Math.max(0, centro - metade);
  let fim = Math.min(n, inicio + LIMITE_VISUAL - 1);
  inicio = Math.max(0, fim - LIMITE_VISUAL + 1);
  // garante que o x pedido apareça
  if (x < inicio) { inicio = Math.max(0, x - 2); fim = Math.min(n, inicio + LIMITE_VISUAL - 1); }
  if (x > fim) { fim = Math.min(n, x + 2); inicio = Math.max(0, fim - LIMITE_VISUAL + 1); }
  return { inicio, fim };
}

function escapar(s) {
  return s.replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

form.addEventListener('submit', (e) => { e.preventDefault(); calcular(); });

$('exemplo').addEventListener('click', () => {
  $('n').value = 10; $('p').value = 0.3; $('x').value = 3;
  calcular();
});

// primeiro cálculo ao abrir a página
calcular();
