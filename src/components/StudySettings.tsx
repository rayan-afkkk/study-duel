import { Brain, Gauge, Languages, Target } from 'lucide-react'
import { Segmented } from './ui/segmented'
import { setSettings, useSettings } from '@/lib/settings'

/** Language / difficulty / SLO-vs-concept controls (feature 8 + 13). */
export function StudySettings({ compact = false }: { compact?: boolean }) {
  const s = useSettings()
  return (
    <div className={compact ? 'grid gap-3 md:grid-cols-3' : 'space-y-6'}>
      <div>
        {!compact && <p className="section-label mb-3 flex items-center gap-2"><Languages className="h-3.5 w-3.5" /> Language</p>}
        <Segmented
          size="sm"
          value={s.language}
          onChange={(language) => setSettings({ language })}
          options={[
            { value: 'en', label: 'English' },
            { value: 'ur', label: 'اردو' },
            { value: 'roman', label: 'Roman Urdu' },
          ]}
        />
      </div>
      <div>
        {!compact && <p className="section-label mb-3 flex items-center gap-2"><Gauge className="h-3.5 w-3.5" /> Difficulty</p>}
        <Segmented
          size="sm"
          value={s.difficulty}
          onChange={(difficulty) => setSettings({ difficulty })}
          options={[
            { value: 'easy', label: 'Easy' },
            { value: 'medium', label: 'Medium' },
            { value: 'hard', label: 'Hard' },
          ]}
        />
      </div>
      <div>
        {!compact && <p className="section-label mb-3 flex items-center gap-2"><Target className="h-3.5 w-3.5" /> Mode</p>}
        <Segmented
          size="sm"
          value={s.mode}
          onChange={(mode) => setSettings({ mode })}
          options={[
            { value: 'concept', label: 'Concept', icon: <Brain /> },
            { value: 'slo', label: 'SLO-based', icon: <Target /> },
          ]}
        />
      </div>
    </div>
  )
}
