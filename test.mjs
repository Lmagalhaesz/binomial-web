import { combinacoes, probabilidadeIndividual, probabilidadeAcumulada, distribuicao, validar } from './binomial.js';

let falhas = 0;
const perto = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
function t(nome, ok, extra = '') {
  if (!ok) { falhas++; console.log('FALHOU  ' + nome + '  ' + extra); }
  else console.log('ok      ' + nome);
}

// C(n,x)
t('C(5,2)=10', combinacoes(5, 2) === 10, combinacoes(5,2));
t('C(10,0)=1', combinacoes(10, 0) === 1);
t('C(52,5)=2598960', combinacoes(52, 5) === 2598960, combinacoes(52,5));
t('C(30,15)=155117520', combinacoes(30, 15) === 155117520, combinacoes(30,15));
t('C(200,100) finito', Number.isFinite(combinacoes(200, 100)), combinacoes(200,100));

// P(X=x) — valores conferidos à mão
t('n=5 p=0.5 x=2 -> 0.3125', perto(probabilidadeIndividual(5, 0.5, 2), 10 * 0.5 ** 5));
t('n=10 p=0.3 x=3 -> 0.266827932', perto(probabilidadeIndividual(10, 0.3, 3), 0.26682793200000005, 1e-12));
t('n=6 p=1/6 x=0 -> (5/6)^6', perto(probabilidadeIndividual(6, 1/6, 0), (5/6) ** 6));
t('n=1000 p=0.5 x=500 nao-NaN', probabilidadeIndividual(1000, 0.5, 500) > 0.02);
t('n=5000 p=0.5 x=2500 nao-NaN', probabilidadeIndividual(5000, 0.5, 2500) > 0, probabilidadeIndividual(5000,0.5,2500));

// bordas p=0 / p=1
t('p=0 x=0 -> 1', probabilidadeIndividual(8, 0, 0) === 1);
t('p=0 x=3 -> 0', probabilidadeIndividual(8, 0, 3) === 0);
t('p=1 x=n -> 1', probabilidadeIndividual(8, 1, 8) === 1);
t('p=1 x=2 -> 0', probabilidadeIndividual(8, 1, 2) === 0);
t('n=0 x=0 -> 1', probabilidadeIndividual(0, 0.4, 0) === 1);

// soma da distribuicao = 1
for (const [n, p] of [[5,0.5],[10,0.3],[47,0.87],[300,0.01],[1000,0.5]]) {
  const s = distribuicao(n, p).reduce((a,b)=>a+b,0);
  t(`soma n=${n} p=${p} == 1`, perto(s, 1, 1e-9), s);
}

// acumulada
t('acum n=5 p=0.5 x=5 -> 1', perto(probabilidadeAcumulada(5,0.5,5), 1));
t('acum n=5 p=0.5 x=2 -> 0.5', perto(probabilidadeAcumulada(5,0.5,2), 0.5));
t('acum n=10 p=0.3 x=3 -> 0.6496107184', perto(probabilidadeAcumulada(10,0.3,3), 0.6496107184, 1e-10), probabilidadeAcumulada(10,0.3,3));
t('acum monotona', (()=>{let prev=-1; for(let i=0;i<=40;i++){const v=probabilidadeAcumulada(40,0.35,i); if(v<prev-1e-15) return false; prev=v;} return true;})());
// acumulada bate com soma direta no ramo da cauda (x > n/2)
t('acum ramo cauda == soma direta', (()=>{const n=60,p=0.4,x=45; let s=0; for(let i=0;i<=x;i++) s+=probabilidadeIndividual(n,p,i); return perto(probabilidadeAcumulada(n,p,x), s, 1e-12);})());
t('acum p=0 x=0 -> 1', perto(probabilidadeAcumulada(9,0,0), 1));
t('acum n grande <= 1', probabilidadeAcumulada(20000,0.5,10000) <= 1);

// validacao
t('rejeita n negativo', validar(-1, 0.5, 0) !== null);
t('rejeita p>1', validar(5, 1.5, 0) !== null);
t('rejeita x>n', validar(5, 0.5, 6) !== null);
t('rejeita x nao inteiro', validar(5, 0.5, 2.5) !== null);
t('aceita valido', validar(10, 0.3, 3) === null);

console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${falhas} FALHA(S)`);
process.exit(falhas ? 1 : 0);
