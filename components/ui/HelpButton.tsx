import Link from 'next/link'

export default function HelpButton() {
  return (
    <Link
      href="/help"
      className="w-8 h-8 flex items-center justify-center rounded-full border border-cellar-border text-cellar-muted hover:text-cellar-cream hover:border-cellar-amber transition-colors text-sm font-semibold shrink-0"
      aria-label="Help & FAQ"
    >
      ?
    </Link>
  )
}
