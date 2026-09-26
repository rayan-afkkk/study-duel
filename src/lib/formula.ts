/**
 * Tiny, safe math-expression compiler for AI-generated experiment formulas.
 * Only numbers, known variable names, + - * / ^ ( ) , and a whitelist of Math functions are allowed —
 * anything else is rejected before compiling, so AI output can never run arbitrary code.
 */
const FUNCS = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sqrt', 'abs', 'log', 'log10', 'exp', 'min', 'max', 'pow', 'floor', 'ceil', 'round']
const CONSTS: Record<string, string> = { PI: 'Math.PI', E: 'Math.E', pi: 'Math.PI', g: '9.8' }

export type Compiled = (vars: Record<string, number>) => number

export function compileFormula(expr: string, variables: string[]): Compiled | null {
  const src = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').trim()
  if (!src || src.length > 300) return null
  const tokens = src.match(/\d+\.?\d*(?:e[+-]?\d+)?|\.\d+|[A-Za-z_][A-Za-z0-9_]*|[+\-*/^(),\s]/g)
  if (!tokens || tokens.join('') !== src) return null // unknown characters present
  const vars = new Set(variables)
  let out = ''
  for (const t of tokens) {
    if (/^[A-Za-z_]/.test(t)) {
      if (vars.has(t)) out += `v[${JSON.stringify(t)}]`
      else if (FUNCS.includes(t)) out += `Math.${t}`
      else if (t === 'rad') out += '((x)=>x*Math.PI/180)'
      else if (t === 'deg') out += '((x)=>x*180/Math.PI)'
      else if (t in CONSTS) out += CONSTS[t]
      else return null // unknown identifier
    } else if (t === '^') out += '**'
    else out += t
  }
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('v', `"use strict"; return (${out});`) as (v: Record<string, number>) => number
    fn(Object.fromEntries(variables.map((k) => [k, 1]))) // smoke test
    return (v) => {
      const r = Number(fn(v))
      return Number.isFinite(r) ? r : NaN
    }
  } catch {
    return null
  }
}

export function fmt(n: number) {
  if (!Number.isFinite(n)) return '—'
  const a = Math.abs(n)
  if (a !== 0 && (a >= 1e6 || a < 1e-3)) return n.toExponential(2)
  return String(Math.round(n * 1000) / 1000)
}
