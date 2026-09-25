import { Fragment } from 'react'

/** Renders **bold** segments from AI text. */
export function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <Fragment key={i}>{p.replace(/\*\*/g, '')}</Fragment>,
      )}
    </>
  )
}
