// Distribuicao binomial: P(X = x) = C(n,x) * p^x * q^(n-x), com q = 1 - p
// Obs: usar n! direto nao funciona, porque a partir de n = 171 o JavaScript
// devolve Infinity e a conta vira NaN. Por isso os calculos sao feitos com
// logaritmo e no final aplica-se Math.exp().

// guarda os valores de ln(k!) ja calculados
const logFactCache = [0, 0];

function logFactorial(k) {
  for (let i = logFactCache.length; i <= k; i++) {
    logFactCache[i] = logFactCache[i - 1] + Math.log(i);
  }
  return logFactCache[k];
}

// ln de C(n,x)
export function logCombinacoes(n, x) {
  return logFactorial(n) - logFactorial(x) - logFactorial(n - x);
}

// C(n,x) para mostrar na tela. Multiplica e divide passo a passo em vez de
// usar fatorial, assim o resultado continua inteiro e exato.
export function combinacoes(n, x) {
  if (x < 0 || x > n) return 0;
  const k = Math.min(x, n - x);
  let r = 1;
  for (let i = 1; i <= k; i++) {
    r = (r * (n - k + i)) / i;
    if (!Number.isFinite(r)) return Math.exp(logCombinacoes(n, x));
  }
  // tira a sobra da divisao
  return r <= Number.MAX_SAFE_INTEGER ? Math.round(r) : r;
}

// confere os dados digitados; devolve a mensagem de erro ou null se estiver ok
export function validar(n, p, x) {
  if (!Number.isInteger(n) || n < 0) return 'n deve ser um numero inteiro maior ou igual a 0.';
  if (n > 20000) return 'n muito grande para esta calculadora (maximo 20000).';
  if (!Number.isFinite(p) || p < 0 || p > 1) return 'p deve estar entre 0 e 1.';
  if (x !== null) {
    if (!Number.isInteger(x) || x < 0) return 'x deve ser um numero inteiro maior ou igual a 0.';
    if (x > n) return 'x nao pode ser maior que n.';
  }
  return null;
}

// 1) Probabilidade binomial individual: P(X = x)
// p = 0 e p = 1 sao tratados antes, senao ln(0) estraga a conta
export function probabilidadeIndividual(n, p, x) {
  if (x < 0 || x > n) return 0;
  if (p === 0) return x === 0 ? 1 : 0;
  if (p === 1) return x === n ? 1 : 0;
  const q = 1 - p;
  const ln = logCombinacoes(n, x) + x * Math.log(p) + (n - x) * Math.log(q);
  return Math.exp(ln);
}

// 2) Probabilidade binomial acumulada: P(X <= x) = P(0) + P(1) + ... + P(x)
export function probabilidadeAcumulada(n, p, x) {
  if (x < 0) return 0;
  if (x >= n) return 1;
  // quando x passa da metade, soma o lado menor e faz 1 - soma (fica mais preciso)
  if (x > n / 2) {
    let cauda = 0;
    for (let i = n; i > x; i--) cauda += probabilidadeIndividual(n, p, i);
    return Math.min(1, Math.max(0, 1 - cauda));
  }
  let soma = 0;
  for (let i = 0; i <= x; i++) soma += probabilidadeIndividual(n, p, i);
  return Math.min(1, soma);
}

// lista com P(X = i) para todo i de 0 ate n (usada no grafico e na tabela)
export function distribuicao(n, p) {
  const out = new Array(n + 1);
  for (let i = 0; i <= n; i++) out[i] = probabilidadeIndividual(n, p, i);
  return out;
}

// media, variancia e desvio padrao da binomial
export function resumo(n, p) {
  const media = n * p;
  const variancia = n * p * (1 - p);
  return { media, variancia, desvio: Math.sqrt(variancia) };
}
