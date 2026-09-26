import { lazy } from 'react'

export type Subject = 'Physics' | 'Chemistry' | 'Biology'

export interface SimDef {
  id: string
  name: string
  subject: Subject
  desc: string
  keywords: string[]
  Component: React.LazyExoticComponent<() => React.JSX.Element>
}

/** Library of animated experiments across the sciences. The AI picks one by id; keywords are the offline fallback. */
export const SIMS: SimDef[] = [
  // ---------- Physics ----------
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
  {
    id: 'lens',
    name: 'Convex Lens & Images',
    subject: 'Physics',
    desc: 'Ray diagrams, real/virtual images, 1/f = 1/u + 1/v, magnification',
    keywords: ['lens', 'optics', 'refraction', 'image', 'focal', 'magnif', 'ray diagram', 'eye', 'camera', 'light'],
    Component: lazy(() => import('./Lens')),
  },
  {
    id: 'spring',
    name: "Hooke's Law Spring",
    subject: 'Physics',
    desc: 'Spring extension F = kx, elastic limit and mass–spring oscillation',
    keywords: ['spring', 'hooke', 'elastic', 'extension', 'stretch', 'deformation', 'oscillation'],
    Component: lazy(() => import('./Spring')),
  },
  {
    id: 'halflife',
    name: 'Radioactive Half-life',
    subject: 'Physics',
    desc: 'Random decay of nuclei, half-life and the decay curve',
    keywords: ['radioactiv', 'half-life', 'half life', 'decay', 'nucle', 'isotope', 'alpha', 'beta', 'gamma', 'carbon dating'],
    Component: lazy(() => import('./HalfLife')),
  },
  // ---------- Chemistry ----------
  {
    id: 'gaslaws',
    name: 'Gas Laws (Boyle & Charles)',
    subject: 'Chemistry',
    desc: 'Pressure, volume and temperature of a gas: PV = nRT',
    keywords: ['gas', 'pressure', 'boyle', 'charles', 'kinetic', 'volume', 'temperature', 'ideal gas'],
    Component: lazy(() => import('./GasLaws')),
  },
  {
    id: 'states',
    name: 'States of Matter',
    subject: 'Chemistry',
    desc: 'Particles in solids, liquids and gases; melting and boiling',
    keywords: ['states of matter', 'solid', 'liquid', 'melting', 'boiling', 'evaporation', 'particle', 'kinetic theory', 'matter'],
    Component: lazy(() => import('./StatesOfMatter')),
  },
  {
    id: 'reaction',
    name: 'Rate of Reaction',
    subject: 'Chemistry',
    desc: 'Collision theory: temperature, concentration and catalysts',
    keywords: ['rate of reaction', 'reaction rate', 'collision', 'catalyst', 'activation energy', 'concentration', 'kinetics'],
    Component: lazy(() => import('./ReactionRate')),
  },
  {
    id: 'titration',
    name: 'Acid–Base Titration',
    subject: 'Chemistry',
    desc: 'pH, indicators, neutralisation and the titration curve',
    keywords: ['acid', 'base', 'alkali', 'ph', 'neutral', 'titration', 'indicator', 'salt'],
    Component: lazy(() => import('./AcidBase')),
  },
  {
    id: 'atom',
    name: 'Atom Builder',
    subject: 'Chemistry',
    desc: 'Protons, neutrons, electron shells and valence electrons (Z = 1–20)',
    keywords: ['atom', 'atomic structure', 'electron', 'proton', 'neutron', 'shell', 'periodic table', 'valence', 'configuration', 'element'],
    Component: lazy(() => import('./Atom')),
  },
  // ---------- Biology ----------
  {
    id: 'photosynthesis',
    name: 'Photosynthesis Rate',
    subject: 'Biology',
    desc: 'Light, CO₂ and temperature as limiting factors (pondweed bubbles)',
    keywords: ['photosynthesis', 'chlorophyll', 'plant', 'leaf', 'limiting factor', 'glucose', 'oxygen', 'nutrition in plants'],
    Component: lazy(() => import('./Photosynthesis')),
  },
  {
    id: 'osmosis',
    name: 'Osmosis in Cells',
    subject: 'Biology',
    desc: 'Plant and animal cells in hypotonic, isotonic and hypertonic solutions',
    keywords: ['osmosis', 'diffusion', 'cell membrane', 'turgid', 'plasmolysis', 'transport', 'solution', 'cell'],
    Component: lazy(() => import('./Osmosis')),
  },
  {
    id: 'enzyme',
    name: 'Enzyme Activity',
    subject: 'Biology',
    desc: 'Lock-and-key, optimum temperature and pH, denaturation',
    keywords: ['enzyme', 'digestion', 'active site', 'substrate', 'denature', 'protein', 'catalyst', 'biochemistry'],
    Component: lazy(() => import('./Enzyme')),
  },
  {
    id: 'heart',
    name: 'Heart & Circulation',
    subject: 'Biology',
    desc: 'Double circulation, heart rate and cardiac output during exercise',
    keywords: ['heart', 'blood', 'circulat', 'transport in animals', 'pulse', 'artery', 'vein', 'exercise', 'respiration'],
    Component: lazy(() => import('./Heart')),
  },
  {
    id: 'ecosystem',
    name: 'Predator & Prey',
    subject: 'Biology',
    desc: 'Population cycles, food chains and ecosystems',
    keywords: ['ecosystem', 'population', 'predator', 'prey', 'food chain', 'food web', 'ecology', 'environment', 'community'],
    Component: lazy(() => import('./Ecosystem')),
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
