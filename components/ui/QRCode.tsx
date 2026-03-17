'use client'
import { useEffect, useRef } from 'react'
import QRCodeLib from 'qrcode'

interface Props {
  value: string
  size?: number
  /** Background colour – defaults to transparent */
  bg?: string
  /** Foreground colour – defaults to #C8A96E (cellar-amber) */
  fg?: string
}

export default function QRCode({ value, size = 180, bg = '#1a1208', fg = '#C8A96E' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !value) return
    QRCodeLib.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      color: { dark: fg, light: bg },
    })
  }, [value, size, bg, fg])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-xl"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}
