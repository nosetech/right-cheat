'use client'
import { useRef, useState } from 'react'

export const useTruncatedTooltip = () => {
  const ref = useRef<HTMLParagraphElement>(null)
  const [isTruncated, setIsTruncated] = useState(false)

  const checkIfTruncated = () => {
    if (ref.current) {
      setIsTruncated(ref.current.scrollWidth > ref.current.clientWidth)
    }
  }

  return { ref, isTruncated, checkIfTruncated }
}
