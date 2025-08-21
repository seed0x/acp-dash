import Link from 'next/link';

export default function Header() {
  return (
    <header className="sticky top-0 z-20 backdrop-blur border-b border-[var(--border)] bg-[color:rgba(11,17,32,0.85)]">
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl sm:text-2xl">
          ACP — Operations
        </Link>
        <div className="flex items-center gap-4">
          <a href="/api/health" target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--muted)] hover:text-white">
            Health Check
          </a>
        </div>
      </nav>
    </header>
  );
}