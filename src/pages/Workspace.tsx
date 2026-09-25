import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  BookOpenText,
  FileText,
  FlaskConical,
  Headphones,
  Layers,
  ListChecks,
  Map as MapIcon,
  ScrollText,
  Settings2,
  Share2,
  Swords,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { db, deleteDocument } from '@/lib/db'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { StudySettings } from '@/components/StudySettings'
import { SkeletonBlock } from '@/components/AsyncState'
import { EmptyState } from '@/components/EmptyState'
import { useReadiness } from '@/hooks/useStats'
import { ExplanationTab } from '@/features/ExplanationTab'
import { SummaryTab } from '@/features/SummaryTab'
import { FlashcardsTab } from '@/features/FlashcardsTab'
import { McqTab } from '@/features/McqTab'
import { MindMapTab } from '@/features/MindMapTab'
import { PodcastTab } from '@/features/PodcastTab'
import { ExperimentsTab } from '@/features/ExperimentsTab'
import { GuessPaperTab } from '@/features/GuessPaperTab'
import { ArenaTab } from '@/features/ArenaTab'
import { ShareToGroupDialog } from '@/components/ShareToGroupDialog'
import { useDocViewer } from '@/components/DocViewer'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'explain', label: 'Explanation', icon: BookOpenText, C: ExplanationTab },
  { id: 'summary', label: 'Summary', icon: FileText, C: SummaryTab },
  { id: 'flashcards', label: 'Flashcards', icon: Layers, C: FlashcardsTab },
  { id: 'mcqs', label: 'MCQs', icon: ListChecks, C: McqTab },
  { id: 'mindmap', label: 'Mind Map', icon: MapIcon, C: MindMapTab },
  { id: 'podcast', label: 'Podcast', icon: Headphones, C: PodcastTab },
  { id: 'experiments', label: 'Experiments', icon: FlaskConical, C: ExperimentsTab },
  { id: 'paper', label: 'Guess Paper', icon: ScrollText, C: GuessPaperTab },
  { id: 'arena', label: 'Arena', icon: Swords, C: ArenaTab },
] as const

export default function Workspace() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const nav = useNavigate()
  const doc = useLiveQuery(() => db.documents.get(id), [id], null)
  const tab = params.get('tab') ?? 'explain'
  const [showSettings, setShowSettings] = useState(false)
  const [share, setShare] = useState(false)
  const ready = useReadiness(id)
  const { open } = useDocViewer()

  // keep the active tab visible in the horizontally-scrolling tab bar (phones)
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('[role="tablist"] [role="tab"][data-state="active"]')
    el?.parentElement?.scrollTo({ left: el.offsetLeft - 16, behavior: 'smooth' })
  }, [tab, doc?.id])

  if (doc === null) return <SkeletonBlock />
  if (!doc)
    return (
      <EmptyState
        icon={<FileText />}
        title="Chapter not found"
        desc="It may have been deleted."
        action={
          <Button asChild variant="coral">
            <Link to="/app">Back home</Link>
          </Button>
        }
      />
    )

  const remove = async () => {
    if (!confirm(`Delete "${doc.title}" and all its generated content?`)) return
    await deleteDocument(doc.id)
    toast.success('Chapter deleted')
    nav('/app')
  }

  return (
    <div>
      <div className="no-print mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 lg:flex-1">
          <Link to="/app" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <h1 className="text-4xl leading-tight md:text-5xl">{doc.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={() => open({ docId: doc.id, page: 1 })} className="chip-muted hover:text-foreground">
              <FileText className="h-3 w-3" /> {doc.pageCount} pages · view source
            </button>
            {doc.isDemo && <span className="chip-gold">✨ Demo — works offline</span>}
            {ready?.score != null && <span className="chip-coral">Readiness ~{ready.score}%</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:shrink-0 lg:flex-nowrap">
          <Button variant={showSettings ? 'default' : 'secondary'} size="sm" onClick={() => setShowSettings(!showSettings)}>
            <Settings2 /> Language & level
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShare(true)}>
            <Share2 /> Share to group
          </Button>
          <Button variant="ghost" size="icon" onClick={remove} aria-label="Delete chapter">
            <Trash2 />
          </Button>
        </div>
      </div>

      {showSettings && (
        <div className="no-print surface mb-6 p-4">
          <StudySettings compact />
          <p className="mt-3 text-xs text-muted-foreground">Changing these generates new content (cached separately, so switching back is instant).</p>
        </div>
      )}

      <Tabs value={tab} onValueChange={(t) => setParams({ tab: t })}>
        <div className="no-print sticky top-[57px] z-20 -mx-4 bg-background/85 px-4 py-2 backdrop-blur-xl lg:top-0 lg:mx-0 lg:px-0">
          <TabsList className="flex w-full justify-start overflow-x-auto no-scrollbar">
            {TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className={cn('shrink-0', t.id === 'arena' && 'data-[state=active]:bg-coral data-[state=active]:text-white')}>
                <t.icon /> {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {TABS.map((t) => (
          <TabsContent key={t.id} value={t.id}>
            <t.C doc={doc} />
          </TabsContent>
        ))}
      </Tabs>

      <ShareToGroupDialog open={share} onOpenChange={setShare} docId={doc.id} />
    </div>
  )
}
