import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Animated SVG teacher. While `speaking`, the mouth opens and closes (boosted on each word boundary
 * via the `pulse` counter), eyes blink, and the head bobs gently.
 */
export function TeacherAvatar({
  speaking,
  pulse = 0,
  size = 120,
  variant = 'teacher',
  className,
}: {
  speaking: boolean
  pulse?: number
  size?: number
  variant?: 'teacher' | 'host-a' | 'host-b'
  className?: string
}) {
  const [mouth, setMouth] = useState(0.1)
  const [blink, setBlink] = useState(false)

  useEffect(() => {
    if (!speaking) return setMouth(0.1)
    const t = setInterval(() => setMouth(0.2 + Math.random() * 0.8), 110)
    return () => clearInterval(t)
  }, [speaking])

  useEffect(() => {
    if (speaking) setMouth(1)
  }, [pulse, speaking])

  useEffect(() => {
    const t = setInterval(() => {
      setBlink(true)
      setTimeout(() => setBlink(false), 140)
    }, 3200 + Math.random() * 1500)
    return () => clearInterval(t)
  }, [])

  const palette = {
    teacher: { skin: '#E8B98F', hair: '#2B1B14', shirt: '#EE6A4F', bg: 'hsl(var(--ocean))' },
    'host-a': { skin: '#E4B48A', hair: '#1A1210', shirt: '#E6B54A', bg: 'hsl(var(--plum))' },
    'host-b': { skin: '#C99570', hair: '#161616', shirt: '#6FA8DC', bg: 'hsl(var(--moss))' },
  }[variant]

  const mouthH = 2 + mouth * 12

  return (
    <motion.div
      className={cn('relative shrink-0 overflow-hidden rounded-full', className)}
      style={{ width: size, height: size, background: palette.bg }}
      animate={speaking ? { y: [0, -2, 0] } : { y: 0 }}
      transition={{ repeat: speaking ? Infinity : 0, duration: 0.9 }}
    >
      <svg viewBox="0 0 120 120" width={size} height={size}>
        {/* body */}
        <path d="M22 120 C22 92 40 82 60 82 C80 82 98 92 98 120 Z" fill={palette.shirt} />
        <path d="M52 82 L60 96 L68 82 Z" fill="#fff" opacity="0.85" />
        {/* neck */}
        <rect x="53" y="70" width="14" height="14" rx="5" fill={palette.skin} />
        {/* head */}
        <ellipse cx="60" cy="52" rx="24" ry="27" fill={palette.skin} />
        {/* hair */}
        {variant === 'host-a' ? (
          <path d="M34 52 C32 26 50 20 60 20 C74 20 90 28 86 54 C84 40 76 34 60 33 C46 33 38 40 34 52 Z M34 50 C30 70 34 86 40 92 L42 60 Z M86 50 C90 70 86 86 80 92 L78 60 Z" fill={palette.hair} />
        ) : (
          <path d="M35 48 C34 28 48 22 60 22 C76 22 88 30 85 48 C80 38 72 34 60 35 C48 35 40 40 35 48 Z" fill={palette.hair} />
        )}
        {variant === 'teacher' && (
          <g stroke="#1a1714" strokeWidth="1.8" fill="none" opacity="0.85">
            <circle cx="50" cy="52" r="7" />
            <circle cx="70" cy="52" r="7" />
            <path d="M57 52 L63 52" />
          </g>
        )}
        {/* eyes */}
        <g fill="#1a1714">
          {blink ? (
            <>
              <rect x="46.5" y="51.5" width="7" height="1.6" rx="0.8" />
              <rect x="66.5" y="51.5" width="7" height="1.6" rx="0.8" />
            </>
          ) : (
            <>
              <circle cx="50" cy="52" r="2.6" />
              <circle cx="70" cy="52" r="2.6" />
            </>
          )}
        </g>
        {/* cheeks */}
        <circle cx="44" cy="62" r="3.5" fill="#EE6A4F" opacity="0.25" />
        <circle cx="76" cy="62" r="3.5" fill="#EE6A4F" opacity="0.25" />
        {/* mouth */}
        <motion.ellipse
          cx="60"
          cy="67"
          rx={speaking ? 6 : 7}
          ry={mouthH / 2}
          initial={false}
          animate={{ ry: mouthH / 2 }}
          transition={{ duration: 0.08 }}
          fill="#5a1f1a"
        />
        {!speaking && <path d="M53 66 Q60 71 67 66" stroke="#5a1f1a" strokeWidth="2" fill="none" strokeLinecap="round" />}
      </svg>
      {speaking && (
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-coral"
          animate={{ scale: [1, 1.08, 1], opacity: [0.8, 0.2, 0.8] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
        />
      )}
    </motion.div>
  )
}
