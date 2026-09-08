# Calculadora de Probabilidade Binomial

Implementação em JavaScript (HTML/CSS/JS puro, sem dependências) da fórmula binomial:

```
P(x) = C(n,x) · p^x · q^(n−x)        q = 1 − p
```

Atende as duas situações pedidas:

1. **Probabilidade binomial individual** — `P(X = x)`
2. **Probabilidade binomial acumulada** — `P(X ≤ x) = Σ P(X = i)`, para i de 0 até x

Além disso mostra o desenvolvimento do cálculo, os complementares (`P(X < x)`, `P(X > x)`, `P(X ≥ x)`),
média `μ = n·p`, variância `σ² = n·p·q`, desvio padrão, gráfico de barras e tabela da distribuição.

## Decisões de implementação

- **Cálculo em espaço logarítmico.** `C(n,x)` obtido por `ln(n!) − ln(x!) − ln((n−x)!)`.
  Calcular `n!` diretamente estoura o ponto flutuante IEEE-754 a partir de `n = 171`
  (`Infinity / Infinity = NaN`) e já perde precisão antes disso. Com log-fatorial a
  calculadora funciona até `n = 20.000`.
- **`C(n,x)` exibido** usa a recorrência multiplicativa, que mantém o valor inteiro exato
  enquanto couber em `Number.MAX_SAFE_INTEGER`, caindo para a forma logarítmica acima disso.
- **Casos degenerados tratados antes dos logaritmos.** Com `p = 0` ou `p = 1` a fórmula
  logarítmica produziria `0 · ln(0) = NaN`; esses casos retornam 1 ou 0 diretamente.
- **Acumulada somada pela cauda mais curta.** Para `x > n/2` calcula `1 − Σ_{i>x} P(i)`,
  reduzindo o acúmulo de erro de arredondamento.
- **Janela de exibição.** Com `n` grande, gráfico e tabela mostram uma faixa de 80 valores
  em torno da massa de probabilidade (sempre incluindo o `x` pedido).

## Arquivos

| Arquivo | Papel |
|---|---|
| `binomial.js` | Toda a matemática (módulo ES, sem DOM) |
| `app.js` | Interface: leitura do formulário, renderização, gráfico e tabela |
| `index.html` / `style.css` | Estrutura e estilo |
| `test.mjs` | 32 testes da matemática (`node test.mjs`) |
| `verificar.mjs` | 23 testes de ponta a ponta no Chrome headless (`node verificar.mjs`) |

## Rodar localmente

Os arquivos usam módulos ES, então precisam ser servidos por HTTP (abrir via `file://` é bloqueado pelo navegador):

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

## Testes

```bash
node test.mjs        # matemática
node verificar.mjs   # interface (requer Chrome headless local)
```
