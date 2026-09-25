import { lazy } from 'react'

export interface SimDef {
  id: string
  name: string
  subject: string
  desc: string
  keywords: string[]
  Component: React.LazyExoticComponent<() => React.JSX.Element>
}

/** Library of interactive experiments. The AI picks one by id; keywords are the offline fallback. */
export const SIMS: SimDef[] = [
  {
    id: 'incline',
    name: 'Forces on an Incline',
    subject: 'Physics',
    desc: "Newton's laws, F = ma, weight components and friction on a ramp",
    keywords: ['force', 'friction', 'newton', 'incline', 'ramp', 'dynamics', 'f = ma', 'inertia', 'weight', 'mass', 'motion'],
    Component: lazy(() => import('./Incline')),
  },
  {
    id: 'pendulum',
    name: 'Simple Pendulum',
    subject: 'Physics',
    desc: 'Oscillations, time period, gravity and SHM',
    keywords: ['pendulum', 'oscillation', 'simple harmonic', 'shm', 'period', 'vibration', 'gravity'],
    Component: lazy(() => import('./Pendulum')),
  },
  {
    id: 'projectile',
    name: 'Projectile Motion',
    subject: 'Physics',
    desc: 'Range, height and time of flight of a launched object',
    keywords: ['projectile', 'trajectory', 'kinematics', 'launch', 'range', 'velocity', 'acceleration', 'free fall'],
    Component: lazy(() => import('./Projectile')),
  },
  {
    id: 'circuit',
    name: "Ohm's Law Circuit",
    subject: 'Physics',
    desc: 'Voltage, current, resistance and power in a simple circuit',
    keywords: ['current', 'voltage', 'resistance', 'ohm', 'circuit', 'electricity', 'electric', 'power', 'battery'],
    Component: lazy(() => import('./Circuit')),
  },
  {
    id: 'waves',
    name: 'Transverse Waves',
    subject: 'Physics',
    desc: 'Amplitude, frequency, wavelength and wave speed',
    keywords: ['wave', 'sound', 'frequency', 'wavelength', 'amplitude', 'light', 'vibration'],
    Component: lazy(() => import('./Waves')),
  },
]

export function pickByKeywords(text: string) {
  const t = text.toLowerCase()
  let best = SIMS[0]
  let score = -1
  for (const s of SIMS) {
    const sc = s.keywords.reduce((n, k) => n + (t.split(k).length - 1), 0)
    if (sc > score) {
      score = sc
      best = s
    }
  }
  return best
}
