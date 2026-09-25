import { motion } from 'framer-motion'
import { Atom, BookOpen, Camera, FileText, NotebookPen } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { StudyDoc } from '@/lib/db'
import { cn, relativeTime } from '@/lib/utils'

export const DOC_COLORS = ['bg-ocean', 'bg-card', 'bg-wine', 'bg-moss', 'bg-plum']

export function DocCard({ doc, snippet, index = 0 }: { doc: StudyDoc; snippet?: string; index?: number }) {
  const Icon = doc.isDemo ? Atom : doc.kind === 'pdf' ? BookOpen : doc.kind === 'image' ? Camera : NotebookPen
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} whileHover={{ y: -4 }}>
      <Link
        to={`/doc/${doc.id}`}
        className={cn('flex h-full min-h-[230px] flex-col rounded-3xl border p-5 transition-shadow hover:shadow-xl hover:shadow-black/30', DOC_COLORS[doc.color % DOC_COLORS.length])}
      >
        <Icon className="h-11 w-11 stroke-[1.4] text-foreground/90" />
        <h3 className="mt-4 line-clamp-2 font-sans text-lg font-bold leading-snug">{doc.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-foreground/60">{snippet ?? `${doc.pageCount} pages`}</p>
        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="chip bg-background/30 text-foreground/80">
            <FileText className="h-3 w-3" /> {doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'}
          </span>
          <span className="text-xs text-foreground/55">{relativeTime(doc.createdAt)}</span>
        </div>
      </Link>
    </motion.div>
  )
}

export function QuestCard({ title, desc, reward, onClick, icon }: { title: string; desc: string; reward?: number; onClick: () => void; icon?: React.ReactNode }) {
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="dashed-card flex w-full items-center gap-4 p-5 text-left transition hover:border-coral/50"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-coral-soft text-coral [&_svg]:h-6 [&_svg]:w-6">{icon ?? '+'}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-bold leading-tight">{title}</span>
        <span className="block text-sm text-muted-foreground">{desc}</span>
      </span>
      {reward !== undefined && <span className="chip-gold shrink-0">🪙 +{reward}</span>}
    </motion.button>
  )
}
