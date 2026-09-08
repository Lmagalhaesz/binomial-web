/**
 * Distribuição Binomial
 *   P(X = x) = C(n,x) · p^x · q^(n-x),  q = 1 - p
 *
 * Todo o cálculo é feito em espaço logarítmico para evitar overflow do
 * fatorial (n! vira Infinity a partir de n = 171 em ponto flutuante IEEE-754).
 */

/** Tabela de log(k!) construída sob demanda: logFact[k] = ln(k!). */
const logFactCache = [0, 0];

function logFactorial(k) {
  for (let i = logFactCache.length; i <= k; i++) {
    logFactCache[i] = logFactCache[i - 1] + Math.log(i);
  }
  return logFactCache[k];
}

/** ln C(n,x) */
export function logCombinacoes(n, x) {
  return logFactorial(n) - logFactorial(x) - logFactorial(n - x);
}

/**
 * C(n,x) exato enquanto couber em inteiro seguro; acima disso, aproximação.
 * Usa a recorrência multiplicativa (sem fatorial), que mantém resultados
 * inteiros exatos para valores pequenos e médios.
 */
export function combinacoes(n, x) {
  if (x < 0 || x > n) return 0;
  const k = Math.min(x, n - x);
  let r = 1;
  for (let i = 1; i <= k; i++) {
    r = (r * (n - k + i)) / i;
    if (!Number.isFinite(r)) return Math.exp(logCombinacoes(n, x));
  }
  // Erro de arredondamento da divisão: arredonda quando ainda é exato.
  return r <= Number.MAX_SAFE_INTEGER ? Math.round(r) : r;
}

/** Valida os parâmetros; retorna string de erro ou null. */
export function validar(n, p, x) {
  if (!Number.isInteger(n) || n < 0) return 'n deve ser um inteiro maior ou igual a 0.';
  if (n > 20000) return 'n muito grande para esta calculadora (máximo 20000).';
  if (!Number.isFinite(p) || p < 0 || p > 1) return 'p deve estar entre 0 e 1.';
  if (x !== null) {
    if (!Number.isInteger(x) || x < 0) return 'x deve ser um inteiro maior ou igual a 0.';
    if (x > n) return 'x não pode ser maior que n.';
  }
  return null;
}

/**
 * Probabilidade binomial individual: P(X = x).
 * Casos degenerados (p = 0 ou p = 1) são tratados antes dos logaritmos,
 * porque 0 · ln(0) resulta em NaN.
 */
export function probabilidadeIndividual(n, p, x) {
  if (x < 0 || x > n) return 0;
  if (p === 0) return x === 0 ? 1 : 0;
  if (p === 1) return x === n ? 1 : 0;
  const q = 1 - p;
  const ln = logCombinacoes(n, x) + x * Math.log(p) + (n - x) * Math.log(q);
  return Math.exp(ln);
}

/** Probabilidade binomial acumulada: P(X <= x) = soma de P(X = i), i de 0 a x. */
export function probabilidadeAcumulada(n, p, x) {
  if (x < 0) return 0;
  if (x >= n) return 1;
  // Soma pelo lado mais curto para reduzir acúmulo de erro de arredondamento.
  if (x > n / 2) {
    let cauda = 0;
    for (let i = n; i > x; i--) cauda += probabilidadeIndividual(n, p, i);
    return Math.min(1, Math.max(0, 1 - cauda));
  }
  let soma = 0;
  for (let i = 0; i <= x; i++) soma += probabilidadeIndividual(n, p, i);
  return Math.min(1, soma);
}

/** Vetor com P(X = i) para i de 0 a n. */
export function distribuicao(n, p) {
  const out = new Array(n + 1);
  for (let i = 0; i <= n; i++) out[i] = probabilidadeIndividual(n, p, i);
  return out;
}

/** Medidas resumo da binomial. */
export function resumo(n, p) {
  const media = n * p;
  const variancia = n * p * (1 - p);
  return { media, variancia, desvio: Math.sqrt(variancia) };
}
