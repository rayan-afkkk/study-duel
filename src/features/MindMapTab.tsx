import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ReactFlow, Background, Controls, Handle, Position, type Edge, type Node, type NodeProps } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, MousePointerClick, RefreshCw } from 'lucide-react'
import type { StudyDoc } from '@/lib/db'
import { useAiTask } from '@/hooks/useAiTask'
import { useSettings } from '@/lib/settings'
import { P } from '@/lib/params'
import { AsyncState } from '@/components/AsyncState'
import { PageBadge } from '@/components/DocViewer'
import { Button } from '@/components/ui/button'
import { getCached } from '@/lib/aiClient'
import { slug } from './ExplanationTab'
import type { MindmapData } from '@shared/schemas'
import { cn } from '@/lib/utils'

const BRANCH_COLORS = ['#EE6A4F', '#E6B54A', '#6FA8DC', '#6FCF97', '#B39DDB', '#F48FB1', '#4DD0E1']

type MapNodeData = { label: string; color: string; depth: number; selected: boolean }

function MapNode({ data }: NodeProps<Node<MapNodeData>>) {
  const d = data
  return (
    <div
      className={cn(
        'cursor-pointer rounded-full border-2 px-4 py-2 text-center font-semibold shadow-lg transition-transform hover:scale-105',
        d.depth === 0 ? 'bg-primary px-6 py-4 font-serif text-2xl font-normal text-primary-foreground' : 'bg-card text-sm',
        d.depth === 2 && 'text-xs font-medium',
        d.selected && 'ring-4 ring-offset-2 ring-offset-background',
      )}
      style={{ borderColor: d.depth === 0 ? 'transparent' : d.color, ['--tw-ring-color' as string]: d.color, maxWidth: d.depth === 0 ? 240 : 180 }}
    >
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      {d.label}
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  )
}

const nodeTypes = { map: MapNode }

function layout(data: MindmapData, selected?: string) {
  const byParent = new Map<string | null, MindmapData['nodes']>()
  const ids = new Set(data.nodes.map((n) => n.id))
  for (const n of data.nodes) {
    const p = n.parent && ids.has(n.parent) ? n.parent : null
    byParent.set(p, [...(byParent.get(p) ?? []), n])
  }
  const roots = byParent.get(null) ?? []
  const root = roots[0]
  const nodes: Node<MapNodeData>[] = []
  const edges: Edge[] = []
  if (!root) return { nodes, edges }
  // extra roots become branches
  const branches = [...(byParent.get(root.id) ?? []), ...roots.slice(1)]
  nodes.push({ id: root.id, type: 'map', position: { x: 0, y: 0 }, data: { label: root.label, color: '#fff', depth: 0, selected: selected === root.id }, origin: [0.5, 0.5] })
  const n = Math.max(branches.length, 1)
  branches.forEach((b, i) => {
    const color = BRANCH_COLORS[i % BRANCH_COLORS.length]
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2
    const r1 = 190
    nodes.push({
      id: b.id,
      type: 'map',
      position: { x: Math.cos(angle) * r1 * 1.6, y: Math.sin(angle) * r1 },
      data: { label: b.label, color, depth: 1, selected: selected === b.id },
      origin: [0.5, 0.5],
    })
    edges.push({ id: `${root.id}-${b.id}`, source: root.id, target: b.id, style: { stroke: color, strokeWidth: 3 } })
    const kids = byParent.get(b.id) ?? []
    const wedge = ((Math.PI * 2) / n) * 0.85
    kids.forEach((k, j) => {
      const a = angle - wedge / 2 + (wedge * (j + 0.5)) / kids.length
      const r2 = 330
      nodes.push({
        id: k.id,
        type: 'map',
        position: { x: Math.cos(a) * r2 * 1.6, y: Math.sin(a) * r2 },
        data: { label: k.label, color, depth: 2, selected: selected === k.id },
        origin: [0.5, 0.5],
      })
      edges.push({ id: `${b.id}-${k.id}`, source: b.id, target: k.id, style: { stroke: color, strokeWidth: 2, opacity: 0.7 } })
    })
  })
  return { nodes, edges }
}

export function MindMapTab({ doc }: { doc: StudyDoc }) {
  const s = useSettings()
  const ai = useAiTask('mindmap', doc.id, P.mindmap(s), { auto: true })
  const [sel, setSel] = useState<string>()
  const [, setParams] = useSearchParams()
  const { nodes, edges } = useMemo(() => (ai.data ? layout(ai.data, sel) : { nodes: [], edges: [] }), [ai.data, sel])
  const node = ai.data?.nodes.find((n) => n.id === sel)

  const openExplanation = async () => {
    if (!node) return
    const exp = await getCached('explain', doc.id, P.explain(s))
    const words = node.label.toLowerCase().split(/\W+/).filter((w) => w.length > 2)
    let best = exp?.topics[0]?.title
    let bestScore = 0
    for (const t of exp?.topics ?? []) {
      const hay = (t.title + ' ' + t.content).toLowerCase()
      const sc = words.reduce((n, w) => n + (t.title.toLowerCase().includes(w) ? 3 : hay.includes(w) ? 1 : 0), 0)
      if (sc > bestScore) {
        bestScore = sc
        best = t.title
      }
    }
    setParams(best ? { tab: 'explain', topic: slug(best) } : { tab: 'explain' })
  }

  return (
    <AsyncState status={ai.status} error={ai.error} onRetry={() => ai.run()} messages={['Connecting the ideas…', 'Growing branches…', 'Drawing the big picture…']}>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="surface relative h-[70vh] min-h-[480px] overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.08 }}
            minZoom={0.2}
            nodesDraggable
            onNodeClick={(_, n) => setSel(n.id)}
            onPaneClick={() => setSel(undefined)}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="hsl(var(--border))" gap={28} />
            <Controls showInteractive={false} className="!rounded-xl !border !bg-card [&>button]:!border-border [&>button]:!bg-card [&>button]:!fill-foreground" />
          </ReactFlow>
          <Button variant="secondary" size="sm" className="absolute right-3 top-3" onClick={() => ai.regenerate()}>
            <RefreshCw /> Regenerate
          </Button>
        </div>
        <AnimatePresence mode="wait">
          {node ? (
            <motion.div key={node.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="surface h-fit p-6">
              <p className="section-label">Topic</p>
              <h3 className="mt-2 text-3xl">{node.label}</h3>
              <p className="mt-3 leading-relaxed text-muted-foreground">{node.summary}</p>
              <div className="mt-4 flex items-center justify-between">
                <PageBadge page={node.page} docId={doc.id} />
                <Button size="sm" variant="coral" onClick={openExplanation}>
                  Full explanation <ArrowRight />
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashed-card flex h-fit flex-col items-center gap-3 p-8 text-center">
              <MousePointerClick className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Click any node to see its explanation. Drag to rearrange, scroll to zoom.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AsyncState>
  )
}
