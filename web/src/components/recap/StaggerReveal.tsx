'use client'

import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { SPRING_UI } from '@/lib/motion/apple-spring'

interface StaggerRevealProps {
  children: ReactNode
  className?: string
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.04,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: SPRING_UI,
  },
}

export function StaggerReveal({ children, className }: StaggerRevealProps) {
  return (
    <motion.div
      className={className}
      variants={container}
      initial={false}
      animate="show"
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion() ?? false

  return (
    <motion.div
      className={className}
      variants={item}
      initial={false}
      animate="show"
      transition={reduced ? { duration: 0 } : SPRING_UI}
    >
      {children}
    </motion.div>
  )
}
