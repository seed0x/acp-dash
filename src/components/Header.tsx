import Link from 'next/link';
import { Briefcase } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-20 backdrop-blur-lg border-b bg-background/80">
      <nav className="max-w-screen-xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Briefcase className="h-6 w-6" />
          <span>ACP Operations</span>
        </Link>
        <div className="flex items-center gap-4">
          <a href="/api/health" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            System Health
          </a>
        </div>
      </nav>
    </header>
  );
}