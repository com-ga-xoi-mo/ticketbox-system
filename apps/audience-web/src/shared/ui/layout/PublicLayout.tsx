import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Menu, Sparkles, Ticket, UserRound, LogOut } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { cn } from '../cn';
import { Button } from '../../../components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../../../components/ui/sheet';
import { Separator } from '../../../components/ui/separator';

function Logo() {
  return (
    <Link
      to="/"
      className="group flex items-center gap-3 rounded-full no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="TicketBox trang chủ"
    >
      <span className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform group-hover:-rotate-6">
        <Ticket className="size-5" aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-xl font-black tracking-tight text-foreground">TicketBox</span>
        <span className="mt-1 hidden text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground sm:block">
          Live experiences
        </span>
      </span>
    </Link>
  );
}

function NavLinks({ onClick }: { onClick?: () => void }) {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    onClick?.();
    navigate('/');
  };

  return (
    <nav className="flex flex-col items-start gap-3 md:flex-row md:items-center md:gap-2">
      <Link
        to="/events"
        onClick={onClick}
        className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground no-underline transition-colors hover:bg-secondary hover:text-foreground"
      >
        Sự kiện
      </Link>
      {session && (
        <Link
          to="/orders"
          onClick={onClick}
          className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground no-underline transition-colors hover:bg-secondary hover:text-foreground"
        >
          Đơn hàng
        </Link>
      )}
      {session ? (
        <>
          <Link
            to="/account"
            onClick={onClick}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground no-underline transition-colors hover:bg-secondary hover:text-foreground"
          >
            <UserRound className="size-4" aria-hidden="true" />
            Tài khoản
          </Link>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground no-underline transition-colors hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Đăng xuất
          </button>
        </>
      ) : (
        <Button
          size="sm"
          className="h-9 rounded-full px-5 shadow-lg shadow-primary/20"
          onClick={() => {
            onClick?.();
            navigate('/login');
          }}
        >
          Đăng nhập
        </Button>
      )}
    </nav>
  );
}

export function PublicLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-white/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-card/75 p-1 shadow-sm md:flex">
            <NavLinks />
          </div>
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon-lg" className="rounded-full bg-card/80 md:hidden" aria-label="Mở menu">
                <Menu className="size-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent className="border-l border-border/80 bg-card/95 p-0 backdrop-blur-xl">
              <SheetHeader className="p-6 text-left">
                <SheetTitle>
                  <Logo />
                </SheetTitle>
                <SheetDescription className="flex items-center gap-2 pt-3">
                  <Sparkles className="size-4 text-primary" aria-hidden="true" />
                  Khám phá sự kiện đang hot quanh bạn.
                </SheetDescription>
              </SheetHeader>
              <Separator />
              <div className="p-6">
                <NavLinks onClick={() => setDrawerOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border/70 bg-card/70 backdrop-blur">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 text-sm text-muted-foreground sm:px-6 md:grid-cols-[1fr_auto] lg:px-8">
          <div>
            <Logo />
            <p className="mt-4 max-w-md leading-6">
              Vé sự kiện âm nhạc, nghệ thuật và trải nghiệm live được tuyển chọn cho khán giả Việt Nam.
            </p>
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            <span className="font-semibold text-foreground">© {new Date().getFullYear()} TicketBox</span>
            <span>Mua vé sự kiện dễ dàng.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
