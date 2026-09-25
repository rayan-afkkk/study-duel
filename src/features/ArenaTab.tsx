import { useSearchParams } from 'react-router-dom'
import { Mic, PenLine, MessageCircleQuestion, Swords } from 'lucide-react'
import type { StudyDoc } from '@/lib/db'
import { Segmented } from '@/components/ui/segmented'
import { BossBattle } from './arena/BossBattle'
import { ExplainBack } from './arena/ExplainBack'
import { HandwritingGrade } from './arena/HandwritingGrade'
import { VoiceQuiz } from './arena/VoiceQuiz'

type Mode = 'boss' | 'explain' | 'handwriting' | 'voice'

export function ArenaTab({ doc }: { doc: StudyDoc }) {
  const [params, setParams] = useSearchParams()
  const mode = (params.get('mode') as Mode) || 'boss'
  const set = (m: Mode) => setParams({ tab: 'arena', mode: m })
  return (
    <div className="space-y-6">
      <Segmented
        size="sm"
        className="md:max-w-2xl"
        value={mode}
        onChange={set}
        options={[
          { value: 'boss', label: 'Boss battle', icon: <Swords /> },
          { value: 'explain', label: 'Explain back', icon: <MessageCircleQuestion /> },
          { value: 'handwriting', label: 'Handwriting', icon: <PenLine /> },
          { value: 'voice', label: 'Voice quiz', icon: <Mic /> },
        ]}
      />
      {mode === 'boss' && <BossBattle doc={doc} />}
      {mode === 'explain' && <ExplainBack doc={doc} initialTopic={params.get('topic') ?? undefined} />}
      {mode === 'handwriting' && <HandwritingGrade doc={doc} />}
      {mode === 'voice' && <VoiceQuiz doc={doc} />}
    </div>
  )
}
