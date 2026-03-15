import Image from 'next/image'

export default function CellarLogo({ size = 96 }: { size?: number }) {
  return (
    <Image
      src="/logo-glass.png"
      alt="The Cellar"
      width={size}
      height={size}
      priority
      style={{  }}
    />
  )
}
