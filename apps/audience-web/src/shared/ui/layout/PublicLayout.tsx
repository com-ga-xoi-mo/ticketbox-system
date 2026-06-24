import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Menu, ShoppingBag, Sparkles, Ticket, UserCircle, UserRound } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { useMyProfile } from '../../api/profile';

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
  const { data: profile } = useMyProfile();

  const handleSignOut = () => {
    signOut();
    onClick?.();
    navigate('/login');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
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
      {session ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full focus-visible:ring-0 px-0">
              <Avatar className="h-9 w-9 border border-border/50 hover:opacity-80 transition-opacity">
                <AvatarImage src="" alt={profile?.displayName || 'User'} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(profile?.displayName)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{profile?.displayName || 'Tài khoản'}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {profile?.email || 'Đang tải...'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/account" onClick={onClick} className="cursor-pointer w-full flex items-center">
                <UserCircle className="mr-2 h-4 w-4" />
                <span>Hồ sơ cá nhân</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/account/orders" onClick={onClick} className="cursor-pointer w-full flex items-center">
                <ShoppingBag className="mr-2 h-4 w-4" />
                <span>Đơn hàng của tôi</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/account/tickets" onClick={onClick} className="cursor-pointer w-full flex items-center">
                <Ticket className="mr-2 h-4 w-4" />
                <span>Vé của tôi</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Đăng xuất</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
