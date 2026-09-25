/** Offline demo chapter + all of its pre-generated AI content (no API calls needed). */
import type {
  ExplainData,
  FlashcardsData,
  GuessPaperData,
  McqsData,
  MindmapData,
  PodcastData,
  SummaryData,
} from '@shared/schemas'

export const DEMO_TITLE = 'Physics 9 · Ch 3 — Force & Motion (Dynamics)'

export const DEMO_PAGES: string[] = [
  `Chapter 3: Dynamics — Force and Motion

Dynamics is the branch of mechanics that studies motion together with the causes of motion. In kinematics we only described motion; in dynamics we ask WHY things start, stop, speed up or turn.

Force
A force is a push or a pull that changes, or tends to change, the state of rest or of uniform motion of a body. A force can also change the shape or direction of a body. Force is a vector quantity: it has both magnitude and direction. The SI unit of force is the newton (N).

Types of forces
Contact forces act when two bodies touch each other, for example friction, tension in a rope, normal force and air resistance.
Non-contact (field) forces act from a distance, for example gravitational force, magnetic force and electrostatic force.
When several forces act on a body, their combined effect is called the net force or resultant force. If the forces are balanced (net force = 0), the state of motion does not change.`,

  `Newton's First Law of Motion (Law of Inertia)
A body continues its state of rest or of uniform motion in a straight line unless an unbalanced (net) external force acts on it.

Inertia
Inertia is the tendency of a body to resist any change in its state of rest or motion. The greater the mass of a body, the greater its inertia. That is why it is harder to push a loaded truck than an empty rickshaw.

Examples of inertia in daily life
1. When a moving bus suddenly brakes, passengers lurch forward because their bodies tend to keep moving.
2. When a stationary bus suddenly starts, passengers fall backward.
3. Dust comes out of a carpet when it is beaten with a stick — the carpet moves but the dust stays at rest.
4. Seat belts in cars protect passengers from the effects of inertia during sudden stops.
5. A coin placed on a card over a glass falls into the glass when the card is flicked quickly.`,

  `Newton's Second Law of Motion
When a net force acts on a body, it produces an acceleration in the direction of the force. The acceleration is directly proportional to the net force and inversely proportional to the mass of the body.
a ∝ F and a ∝ 1/m, therefore F = ma

One newton is the force that produces an acceleration of 1 m/s² in a body of mass 1 kg (1 N = 1 kg m/s²).

Worked example: A force of 20 N acts on a box of mass 4 kg. Acceleration a = F/m = 20/4 = 5 m/s².

Mass and Weight
Mass is the quantity of matter in a body. It is a scalar, measured in kilograms (kg), and it stays the same everywhere.
Weight is the force with which the Earth pulls a body towards its centre. It is a vector, measured in newtons (N). W = mg, where g ≈ 10 m/s² on Earth.
A 60 kg student weighs about 600 N on Earth but only about 96 N on the Moon (g ≈ 1.6 m/s²), while the mass is still 60 kg.
Mass is measured with a physical balance; weight is measured with a spring balance.`,

  `Newton's Third Law of Motion
To every action there is always an equal and opposite reaction.
Action and reaction forces act on DIFFERENT bodies, so they never cancel each other out. They always occur in pairs and act at the same time.

Examples of the third law
1. Walking: our feet push the ground backward; the ground pushes us forward.
2. Rocket: the rocket pushes hot gases downward out of its nozzle; the gases push the rocket upward.
3. Swimming: a swimmer pushes water backward and the water pushes the swimmer forward.
4. Recoil of a gun: when a bullet is fired forward, the gun moves backward and hits the shoulder.
5. A book lying on a table pushes down on the table; the table pushes up on the book with an equal force (normal reaction).`,

  `Momentum
Momentum is the quantity of motion in a body. It is the product of mass and velocity: p = mv.
Momentum is a vector quantity and its SI unit is kg m/s (equivalent to N s).
A slow, heavy truck and a fast cricket ball can both have large momentum.

Law of Conservation of Momentum
The total momentum of an isolated system remains constant, provided no external force acts on it. Momentum before collision = momentum after collision.
Example: when a gun fires a bullet, the forward momentum of the bullet equals the backward momentum of the gun, so the total momentum stays zero.

Force and rate of change of momentum
Newton's second law can also be written as F = (mv_f − mv_i) / t: force equals the rate of change of momentum.
Impulse = F × t = change in momentum.
A fielder pulls his hands back while catching a fast cricket ball to increase the time of impact; this reduces the force on his hands. Airbags and crumple zones in cars work on the same idea.`,

  `Friction
Friction is the force that opposes the motion of one surface over another. It acts along the surfaces in contact and opposite to the direction of motion.

Types of friction
Static friction acts when a body is at rest and tries to move. Its maximum value is called limiting friction.
Kinetic (sliding) friction acts when one surface slides over another; it is less than limiting friction.
Rolling friction acts when a body rolls over a surface; it is much smaller than sliding friction. This is why wheels and ball bearings are used.

Advantages of friction: we can walk without slipping, write with a pen, and vehicles can brake.
Disadvantages of friction: it wastes energy as heat, causes wear and tear of machine parts and tyres.
Ways to reduce friction: lubricants (oil, grease), ball bearings, polishing surfaces, streamlined shapes.

Uniform Circular Motion
A body moving in a circle needs a force directed towards the centre, called the centripetal force: F = mv²/r. For a car turning on a road, friction between the tyres and the road provides this force.`,
]

export const DEMO_EXPLAIN: ExplainData = {
  topics: [
    {
      title: 'What is a Force?',
      content:
        'A **force** is simply a **push or a pull**. When you push a door open, kick a football, or pull your school bag — you are applying a force.\n\nA force can do three things: make something **start moving**, **stop or change its speed**, or **change its shape** (like squeezing a ball of dough for roti). Because a force has a size AND a direction, we call it a **vector**. We measure force in **newtons (N)**.\n\nSome forces need **contact** — like friction when you slide on the floor. Others work from a **distance** — like gravity pulling a mango down from a tree, even though the Earth is not touching it!',
      keyPoints: [
        'Force = a push or a pull',
        'SI unit of force is the newton (N)',
        'Force is a vector — it has magnitude and direction',
        'Contact forces: friction, tension, normal force; non-contact: gravity, magnetic, electric',
        'Balanced forces (net force = 0) do not change motion',
      ],
      example: 'In a tug-of-war, if both teams pull equally, the rope does not move — the forces are balanced.',
      pages: [1],
      diagram:
        'flowchart TD\n  F["Force"] --> C["Contact forces"]\n  F --> N["Non-contact forces"]\n  C --> C1["Friction"]\n  C --> C2["Tension"]\n  C --> C3["Normal force"]\n  N --> N1["Gravity"]\n  N --> N2["Magnetic"]\n  N --> N3["Electrostatic"]',
      chart: null,
    },
    {
      title: "Newton's First Law & Inertia",
      content:
        "Newton's **first law** says: things are 'lazy' about changing their motion. If something is resting, it keeps resting. If it is moving straight, it keeps moving — until an **unbalanced force** acts on it.\n\nThis laziness is called **inertia**. More **mass** means more inertia. That's why pushing a loaded truck is so much harder than pushing an empty rickshaw.\n\nThink of a bus ride: when the driver suddenly brakes, the bus stops but **your body wants to keep moving**, so you lurch forward. That is why **seat belts** save lives!",
      keyPoints: [
        'A body stays at rest or in uniform motion unless a net force acts',
        'Inertia = resistance to change in motion',
        'Greater mass → greater inertia',
        'Seat belts protect us from the effects of inertia',
      ],
      example: 'Beating a carpet with a stick: the carpet moves but the dust stays behind and falls out.',
      pages: [2],
      diagram:
        'flowchart LR\n  A["Bus moving fast"] --> B["Driver brakes suddenly"]\n  B --> C["Bus stops"]\n  B --> D["Your body keeps moving"]\n  D --> E["You lurch forward"]\n  E --> F["Seat belt holds you"]',
      chart: null,
    },
    {
      title: "Newton's Second Law: F = ma",
      content:
        "The **second law** tells us HOW MUCH an object speeds up. The bigger the **force**, the bigger the **acceleration**. But the heavier the object (more **mass**), the smaller the acceleration.\n\nWe write it as **F = ma**. One **newton** is the force that makes a 1 kg object accelerate at 1 m/s².\n\nExample: push a 4 kg box with 20 N. Acceleration = 20 ÷ 4 = **5 m/s²**. Push a 10 kg box with the same 20 N and it only accelerates at 2 m/s². Same push, heavier box, slower start!",
      keyPoints: ['F = ma', 'Acceleration ∝ force', 'Acceleration ∝ 1 / mass', '1 N = 1 kg m/s²'],
      example: 'An empty shopping trolley speeds up easily; a full one needs a much bigger push for the same acceleration.',
      pages: [3],
      diagram: null,
      chart: {
        type: 'bar',
        title: 'Same 10 N force on different masses → acceleration (m/s²)',
        data: [
          { label: '1 kg', value: 10 },
          { label: '2 kg', value: 5 },
          { label: '5 kg', value: 2 },
          { label: '10 kg', value: 1 },
        ],
      },
    },
    {
      title: 'Mass vs Weight',
      content:
        "People mix these up all the time, but they are different! **Mass** is how much 'stuff' (matter) is in you. It is measured in **kilograms** and it is the **same everywhere** — on Earth, the Moon or Mars.\n\n**Weight** is the **force of gravity** pulling you down. It is measured in **newtons** and depends on where you are: **W = mg**.\n\nA 60 kg student weighs about **600 N on Earth** but only about **96 N on the Moon**, because the Moon's gravity is much weaker. Same student, same mass — very different weight!",
      keyPoints: [
        'Mass: scalar, kg, never changes',
        'Weight: vector (force), N, changes with gravity',
        'W = mg, g ≈ 10 m/s² on Earth',
        'Physical balance measures mass; spring balance measures weight',
      ],
      example: 'Astronauts bounce on the Moon because their weight is about 1/6 of their Earth weight.',
      pages: [3],
      diagram: null,
      chart: {
        type: 'bar',
        title: 'Weight of a 60 kg student (N)',
        data: [
          { label: 'Moon', value: 96 },
          { label: 'Mars', value: 222 },
          { label: 'Earth', value: 588 },
          { label: 'Jupiter', value: 1488 },
        ],
      },
    },
    {
      title: "Newton's Third Law: Action & Reaction",
      content:
        "The **third law** says: **for every action there is an equal and opposite reaction**. Forces always come in **pairs**.\n\nWhen you walk, your foot pushes the ground **backward** — and the ground pushes you **forward**. A rocket pushes hot gas **down**, and the gas pushes the rocket **up** into space!\n\nImportant: the action and reaction act on **different bodies**, so they **never cancel** each other.",
      keyPoints: ['Forces come in equal and opposite pairs', 'Action and reaction act on different bodies', 'They act at the same time'],
      example: 'When a gun fires, the bullet goes forward and the gun kicks back into the shoulder (recoil).',
      pages: [4],
      diagram:
        'flowchart LR\n  R["Rocket engine"] -->|"pushes gas down (action)"| G["Hot gases"]\n  G -->|"push rocket up (reaction)"| R',
      chart: null,
    },
    {
      title: 'Momentum & Impulse',
      content:
        "**Momentum** is 'mass in motion': **p = mv**. A slow, heavy truck and a super-fast cricket ball can both have a lot of momentum.\n\nThe **law of conservation of momentum** says the total momentum stays the same if no outside force acts — like a gun and bullet: the bullet's forward momentum equals the gun's backward momentum.\n\n**Impulse = F × t = change in momentum**. That's why a fielder **pulls his hands back** when catching a fast ball: more time → less force → no hurt hands. Airbags work the same way!",
      keyPoints: ['p = mv, unit kg m/s', 'Total momentum is conserved in an isolated system', 'Force = rate of change of momentum', 'Impulse = F × t'],
      example: 'Crumple zones in cars increase collision time so the force on passengers is smaller.',
      pages: [5],
      diagram:
        'flowchart LR\n  A["Fast ball arrives"] --> B["Fielder pulls hands back"]\n  B --> C["Longer stopping time"]\n  C --> D["Smaller force on hands"]',
      chart: null,
    },
    {
      title: 'Friction & Circular Motion',
      content:
        "**Friction** is the force that **opposes motion** between two surfaces. It's why you can walk without slipping, and why a pen can write.\n\nThere are three kinds: **static** (object not yet moving), **kinetic/sliding** (sliding along), and **rolling** (the smallest!). That's why **wheels** and **ball bearings** make life easy.\n\nWhen a car turns on a road, it needs a force towards the centre of the turn — the **centripetal force, F = mv²/r**. On a road, friction between the tyres and the road provides it. On an oily road, not enough friction → the car skids!",
      keyPoints: [
        'Friction opposes motion',
        'Static > kinetic > rolling friction',
        'Reduce friction: lubricants, ball bearings, polishing, streamlining',
        'Centripetal force F = mv²/r points to the centre',
      ],
      example: 'Cricket players wear spiked shoes to increase friction and avoid slipping on grass.',
      pages: [6],
      diagram:
        'flowchart TD\n  F["Friction"] --> S["Static friction"]\n  F --> K["Kinetic friction"]\n  F --> R["Rolling friction"]\n  S --> L["Maximum value: limiting friction"]\n  R --> W["Smallest, used in wheels"]',
      chart: null,
    },
  ],
}

export const DEMO_SUMMARY: SummaryData = {
  title: 'Force & Motion — One-Page Summary',
  overview:
    'Dynamics explains why objects move the way they do. A force is a push or pull measured in newtons. Newton’s three laws describe how forces change motion: objects resist change (inertia), force produces acceleration (F = ma), and forces always come in equal and opposite pairs. Momentum (p = mv) is conserved in isolated systems, and impulse explains why increasing impact time reduces force. Friction opposes motion and can be useful or wasteful, and circular motion needs a centripetal force.',
  keyPoints: [
    { point: 'Force is a vector; SI unit newton (N).', page: 1 },
    { point: 'Balanced forces do not change the state of motion.', page: 1 },
    { point: 'First law: a body keeps its state of rest or uniform motion unless a net force acts (inertia).', page: 2 },
    { point: 'More mass means more inertia.', page: 2 },
    { point: 'Second law: F = ma; 1 N = 1 kg m/s².', page: 3 },
    { point: 'Weight W = mg changes with gravity; mass does not.', page: 3 },
    { point: 'Third law: action and reaction are equal, opposite and act on different bodies.', page: 4 },
    { point: 'Momentum p = mv is conserved when no external force acts.', page: 5 },
    { point: 'Impulse = F × t = change in momentum.', page: 5 },
    { point: 'Rolling friction < kinetic friction < limiting (static) friction.', page: 6 },
  ],
  keyTerms: [
    { term: 'Force', definition: 'A push or pull that changes or tends to change the state of a body.' },
    { term: 'Inertia', definition: 'Tendency of a body to resist change in its state of rest or motion.' },
    { term: 'Newton (N)', definition: 'Force that gives a 1 kg mass an acceleration of 1 m/s².' },
    { term: 'Weight', definition: 'Force of gravity on a body, W = mg.' },
    { term: 'Momentum', definition: 'Product of mass and velocity, p = mv.' },
    { term: 'Impulse', definition: 'Force × time; equals change in momentum.' },
    { term: 'Limiting friction', definition: 'Maximum value of static friction.' },
    { term: 'Centripetal force', definition: 'Force towards the centre needed for circular motion, F = mv²/r.' },
  ],
}

export const DEMO_FLASHCARDS: FlashcardsData = {
  cards: [
    { front: 'What is a force?', back: 'A push or a pull that changes (or tends to change) the state of rest, motion, shape or direction of a body.', page: 1 },
    { front: 'SI unit of force', back: 'The newton (N). 1 N = 1 kg m/s².', page: 3 },
    { front: 'State Newton’s first law of motion.', back: 'A body stays at rest or in uniform straight-line motion unless a net external force acts on it.', page: 2 },
    { front: 'What is inertia?', back: 'The tendency of a body to resist any change in its state of rest or motion. More mass → more inertia.', page: 2 },
    { front: 'Why do passengers lurch forward when a bus brakes suddenly?', back: 'Because of inertia — their bodies tend to keep moving forward.', page: 2 },
    { front: 'Newton’s second law formula', back: 'F = ma (force = mass × acceleration).', page: 3 },
    { front: 'Difference between mass and weight', back: 'Mass = quantity of matter (kg, scalar, constant). Weight = gravitational force (N, vector, W = mg).', page: 3 },
    { front: 'Weight of a 60 kg student on Earth (g = 10 m/s²)', back: 'W = mg = 60 × 10 = 600 N.', page: 3 },
    { front: 'State Newton’s third law.', back: 'To every action there is an equal and opposite reaction; they act on different bodies.', page: 4 },
    { front: 'Why don’t action and reaction cancel?', back: 'Because they act on different bodies.', page: 4 },
    { front: 'Define momentum and give its unit.', back: 'p = mv; unit kg m/s (or N s). It is a vector.', page: 5 },
    { front: 'Law of conservation of momentum', back: 'Total momentum of an isolated system remains constant.', page: 5 },
    { front: 'Why does a fielder pull his hands back while catching?', back: 'To increase the time of impact, which reduces the force (impulse = F × t).', page: 5 },
    { front: 'Which friction is the smallest?', back: 'Rolling friction.', page: 6 },
    { front: 'Formula for centripetal force', back: 'F = mv²/r, directed towards the centre of the circle.', page: 6 },
  ],
}

export const DEMO_MCQS: McqsData = {
  questions: [
    {
      question: 'The SI unit of force is:',
      options: ['Joule', 'Newton', 'Watt', 'Pascal'],
      answerIndex: 1,
      explanation: 'Force is measured in newtons (N). Joule is energy, watt is power and pascal is pressure.',
      page: 1,
      topic: 'Force',
    },
    {
      question: 'A passenger falls forward when a moving bus stops suddenly. This is due to:',
      options: ['Friction', 'Momentum conservation', 'Inertia', 'Gravity'],
      answerIndex: 2,
      explanation: "The passenger's body tends to continue its motion — that's inertia (Newton's first law).",
      page: 2,
      topic: "Newton's first law",
    },
    {
      question: 'Which body has the greatest inertia?',
      options: ['A cricket ball', 'A bicycle', 'A loaded truck', 'A rickshaw'],
      answerIndex: 2,
      explanation: 'Inertia depends on mass. The loaded truck has the most mass, so it has the most inertia.',
      page: 2,
      topic: "Newton's first law",
    },
    {
      question: 'A 20 N force acts on a 4 kg box. Its acceleration is:',
      options: ['80 m/s²', '5 m/s²', '0.2 m/s²', '24 m/s²'],
      answerIndex: 1,
      explanation: 'a = F/m = 20/4 = 5 m/s². A common mistake is multiplying instead of dividing.',
      page: 3,
      topic: "Newton's second law",
    },
    {
      question: 'The weight of a 60 kg student on Earth (g = 10 m/s²) is:',
      options: ['6 N', '60 N', '600 N', '60 kg'],
      answerIndex: 2,
      explanation: 'W = mg = 60 × 10 = 600 N. Weight is a force, so its unit is newton, not kg.',
      page: 3,
      topic: 'Mass and weight',
    },
    {
      question: 'Which quantity stays the same on the Moon and on Earth?',
      options: ['Weight', 'Mass', 'Gravitational pull', 'Reading of a spring balance'],
      answerIndex: 1,
      explanation: 'Mass is the quantity of matter and never changes. Weight depends on g, which is lower on the Moon.',
      page: 3,
      topic: 'Mass and weight',
    },
    {
      question: 'Action and reaction forces do not cancel each other because they:',
      options: ['Are unequal', 'Act in the same direction', 'Act on different bodies', 'Act at different times'],
      answerIndex: 2,
      explanation: 'They are equal and opposite but act on different bodies, so they cannot cancel.',
      page: 4,
      topic: "Newton's third law",
    },
    {
      question: 'A rocket moves upward because:',
      options: ['Air pushes it up', 'Gases pushed down push the rocket up', 'Gravity is absent in space', 'Its mass decreases to zero'],
      answerIndex: 1,
      explanation: "Newton's third law: the rocket pushes gases down (action) and the gases push the rocket up (reaction).",
      page: 4,
      topic: "Newton's third law",
    },
    {
      question: 'The SI unit of momentum is:',
      options: ['kg m/s', 'kg m/s²', 'N/m', 'J s'],
      answerIndex: 0,
      explanation: 'p = mv, so the unit is kg × m/s = kg m/s (also N s). kg m/s² is the newton.',
      page: 5,
      topic: 'Momentum',
    },
    {
      question: 'A fielder pulls his hands back while catching a fast ball to:',
      options: ['Increase the force', 'Decrease the time of impact', 'Increase the time of impact and reduce force', 'Increase momentum'],
      answerIndex: 2,
      explanation: 'Impulse = F × t. For the same change in momentum, a longer time means a smaller force on the hands.',
      page: 5,
      topic: 'Momentum',
    },
    {
      question: 'Which type of friction is the smallest?',
      options: ['Static friction', 'Limiting friction', 'Sliding friction', 'Rolling friction'],
      answerIndex: 3,
      explanation: 'Rolling friction is much smaller than sliding friction — that is why wheels and ball bearings are used.',
      page: 6,
      topic: 'Friction',
    },
    {
      question: 'The force needed to keep a body moving in a circle is directed:',
      options: ['Away from the centre', 'Towards the centre', 'Along the tangent', 'Vertically upward'],
      answerIndex: 1,
      explanation: 'Centripetal force (F = mv²/r) always points towards the centre of the circular path.',
      page: 6,
      topic: 'Circular motion',
    },
  ],
}

export const DEMO_MINDMAP: MindmapData = {
  nodes: [
    { id: 'root', label: 'Force & Motion', parent: null, summary: 'Dynamics: the study of motion and its causes.', page: 1 },
    { id: 'force', label: 'Force', parent: 'root', summary: 'A push or pull; vector; measured in newtons.', page: 1 },
    { id: 'contact', label: 'Contact forces', parent: 'force', summary: 'Friction, tension, normal force — need touching.', page: 1 },
    { id: 'field', label: 'Non-contact forces', parent: 'force', summary: 'Gravity, magnetic and electric forces act from a distance.', page: 1 },
    { id: 'net', label: 'Net force', parent: 'force', summary: 'Combined effect of all forces; zero means balanced.', page: 1 },
    { id: 'laws', label: "Newton's Laws", parent: 'root', summary: 'Three laws that describe how forces change motion.', page: 2 },
    { id: 'l1', label: 'First law: inertia', parent: 'laws', summary: 'Bodies keep their state of motion unless a net force acts.', page: 2 },
    { id: 'l2', label: 'Second law: F = ma', parent: 'laws', summary: 'Acceleration is proportional to force and inversely to mass.', page: 3 },
    { id: 'l3', label: 'Third law: pairs', parent: 'laws', summary: 'Every action has an equal and opposite reaction on a different body.', page: 4 },
    { id: 'mw', label: 'Mass vs Weight', parent: 'root', summary: 'Mass (kg) is constant; weight W = mg (N) changes with gravity.', page: 3 },
    { id: 'mass', label: 'Mass (kg)', parent: 'mw', summary: 'Quantity of matter; scalar; measured with a physical balance.', page: 3 },
    { id: 'weight', label: 'Weight = mg', parent: 'mw', summary: 'Force of gravity; vector; measured with a spring balance.', page: 3 },
    { id: 'mom', label: 'Momentum', parent: 'root', summary: 'p = mv — mass in motion.', page: 5 },
    { id: 'cons', label: 'Conservation', parent: 'mom', summary: 'Total momentum of an isolated system stays constant.', page: 5 },
    { id: 'imp', label: 'Impulse = F×t', parent: 'mom', summary: 'Longer impact time → smaller force (catching, airbags).', page: 5 },
    { id: 'fric', label: 'Friction', parent: 'root', summary: 'Force opposing motion between surfaces.', page: 6 },
    { id: 'ftypes', label: 'Static, kinetic, rolling', parent: 'fric', summary: 'Rolling friction is the smallest.', page: 6 },
    { id: 'freduce', label: 'Reducing friction', parent: 'fric', summary: 'Lubricants, ball bearings, polishing, streamlining.', page: 6 },
    { id: 'circ', label: 'Circular motion', parent: 'root', summary: 'Needs centripetal force F = mv²/r towards the centre.', page: 6 },
  ],
}

export const DEMO_PODCAST: PodcastData = {
  title: 'Why Your Chai Cup Doesn’t Fly Off the Table',
  lines: [
    { speaker: 'A', text: "Assalam-o-alaikum and welcome to StudyDuel Radio! I'm Ayesha, and today I have a confession: I fell over in the school bus this morning." },
    { speaker: 'B', text: "And I'm Bilal! Don't worry Ayesha, that wasn't clumsiness — that was physics. Specifically, Newton's first law." },
    { speaker: 'A', text: 'Wait, Newton made me fall? Rude.' },
    { speaker: 'B', text: 'Ha! Newton said objects are lazy. If you are moving, you want to keep moving. When the driver slammed the brakes, the bus stopped, but your body kept going. That laziness is called inertia.' },
    { speaker: 'A', text: 'So that’s why seat belts matter. Does everything have the same inertia?' },
    { speaker: 'B', text: 'No — more mass means more inertia. Pushing an empty rickshaw is easy. Pushing a loaded truck? Good luck!' },
    { speaker: 'A', text: 'Okay, so how hard do I have to push to get something moving fast?' },
    { speaker: 'B', text: 'That is the second law: F equals m a. Push a 4 kilogram box with 20 newtons and it accelerates at 5 metres per second squared.' },
    { speaker: 'A', text: 'And a newton is… a very small unit named after a very big scientist?' },
    { speaker: 'B', text: 'Exactly! One newton gives a 1 kilogram mass an acceleration of 1 metre per second squared. Roughly the weight of a small apple.' },
    { speaker: 'A', text: "Speaking of weight — my cousin says she weighs 60 kilograms. Is that wrong?" },
    { speaker: 'B', text: 'Technically yes! 60 kilograms is her mass. Her weight is a force: 60 times 10, so about 600 newtons. On the Moon her mass is still 60, but she would weigh only about 96 newtons.' },
    { speaker: 'A', text: 'Moon diet! Now, the third law — every action has an equal and opposite reaction?' },
    { speaker: 'B', text: 'Yes. When you walk, your foot pushes the ground back, and the ground pushes you forward. A rocket pushes gas down, the gas pushes the rocket up.' },
    { speaker: 'A', text: 'But if they are equal and opposite, why don’t they cancel out?' },
    { speaker: 'B', text: 'Great question — because they act on different bodies! One acts on the ground, the other on you.' },
    { speaker: 'A', text: "Cricket time. Why does the fielder pull his hands back when he catches a six-hitting shot?" },
    { speaker: 'B', text: 'Momentum! The ball has momentum, p equals m v. Pulling hands back increases the time of impact, so the force on the hands becomes smaller. Airbags work the same way.' },
    { speaker: 'A', text: 'And friction — hero or villain?' },
    { speaker: 'B', text: 'Both! It lets us walk and brake, but it wastes energy as heat and wears out tyres. Rolling friction is the smallest, which is why we invented wheels.' },
    { speaker: 'A', text: "Quick recap: inertia keeps things doing what they're doing, F equals m a, forces come in pairs, momentum is p equals m v, and friction opposes motion." },
    { speaker: 'B', text: 'Perfect. Now go smash that MCQ test — and hold on tight in the bus!' },
  ],
}

function paper(board: string, title: string, time: number): GuessPaperData {
  const mcqs = DEMO_MCQS.questions.slice(0, board === 'O-Levels' ? 5 : 10).map((q) => ({ question: q.question, marks: 1, options: q.options, page: q.page }))
  const shorts = [
    { question: 'Define inertia. Give two examples from daily life.', marks: 3, page: 2 },
    { question: 'Differentiate between mass and weight (any four points).', marks: 4, page: 3 },
    { question: "State Newton's third law of motion. Why don't action and reaction cancel each other?", marks: 3, page: 4 },
    { question: 'Define momentum. Write its SI unit and state whether it is a scalar or a vector.', marks: 3, page: 5 },
    { question: 'Why does a fielder pull his hands backward while catching a fast ball?', marks: 3, page: 5 },
    { question: 'Write three advantages and three disadvantages of friction.', marks: 3, page: 6 },
  ]
  const longs = [
    { question: "(a) State and explain Newton's second law of motion and derive F = ma. (b) A force of 20 N acts on a body of mass 4 kg. Find its acceleration.", marks: 8, page: 3 },
    { question: '(a) State the law of conservation of momentum. (b) Explain the recoil of a gun using this law.', marks: 7, page: 5 },
    { question: '(a) What is friction? Describe its types. (b) Describe four methods to reduce friction.', marks: 8, page: 6 },
  ]
  const sections =
    board === 'O-Levels'
      ? [
          { name: 'Section A — Multiple Choice', instructions: 'Choose the correct answer.', questions: mcqs },
          {
            name: 'Section B — Structured Questions',
            instructions: 'Answer all questions. Marks are shown in brackets.',
            questions: [
              { question: '(a) State Newton’s first law. [2]\n(b) Explain why passengers lurch forward when a bus brakes. [2]\n(c) Suggest one safety feature that reduces injuries. [1]', marks: 5, page: 2 },
              { question: '(a) A 1200 kg car accelerates at 2.5 m/s². Calculate the resultant force. [2]\n(b) Explain, in terms of momentum, how an airbag reduces injury. [3]', marks: 5, page: 5 },
              { question: 'A student has a mass of 60 kg. (a) Calculate the weight on Earth (g = 10 N/kg). [2] (b) State and explain how mass and weight change on the Moon. [3]', marks: 5, page: 3 },
              { question: '(a) Describe the difference between static and kinetic friction. [2] (b) Explain why ball bearings are used in machines. [2]', marks: 4, page: 6 },
            ],
          },
        ]
      : [
          { name: 'Section A — MCQs', instructions: 'Encircle the correct option. Each MCQ carries 1 mark.', questions: mcqs },
          { name: 'Section B — Short Questions', instructions: board === 'Sindh Board' ? 'Attempt any FIVE questions.' : 'Attempt ALL questions.', questions: shorts },
          { name: 'Section C — Long Questions', instructions: 'Attempt any TWO questions.', questions: longs },
        ]
  const total = sections.reduce((s, sec) => s + sec.questions.reduce((a, q) => a + q.marks, 0), 0)
  return {
    title,
    board,
    totalMarks: total,
    timeMinutes: time,
    instructions: ['Read all questions carefully before answering.', 'Write neat, labelled diagrams where required.', 'Use g = 10 m/s² unless stated otherwise.'],
    sections,
  }
}

export const DEMO_PAPERS: Record<string, GuessPaperData> = {
  'Sindh Board': paper('Sindh Board', 'Physics IX — Guess Paper (Chapter 3: Dynamics)', 150),
  'Federal Board': paper('Federal Board', 'SSC-I Physics — Model Paper (Dynamics)', 120),
  'O-Levels': paper('O-Levels', 'O-Level Physics 5054 — Practice Paper: Forces & Motion', 90),
  Custom: paper('Custom', 'Custom Practice Paper — Force & Motion', 90),
}
