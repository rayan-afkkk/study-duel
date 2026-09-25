import type { ReactNode } from 'react'

export function EmptyState({ icon, title, desc, action }: { icon: ReactNode; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="dashed-card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-muted-foreground [&_svg]:h-6 [&_svg]:w-6">{icon}</div>
      <h3 className="text-2xl">{title}</h3>
      {desc && <p className="max-w-sm text-sm text-muted-foreground">{desc}</p>}
      {action}
    </div>
  )
}
