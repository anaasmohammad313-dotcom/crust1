import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { ReceiptText, LayoutDashboard, Settings as SettingsIcon, Users, LogOut, UtensilsCrossed } from "lucide-react";
import logo from "@/assets/logo.png";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    await logout();
    toast({ title: "Signed out successfully" });
  };

  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-24 bg-sidebar text-sidebar-foreground flex md:flex-col items-center py-4 px-2 shadow-sm border-b md:border-b-0 md:border-r border-sidebar-border z-20 shrink-0 md:justify-start justify-center gap-4 md:gap-2 no-print">
        <div className="flex items-center justify-center rounded-xl overflow-hidden shadow-sm bg-black border border-primary/30 p-1.5 md:mb-4">
          <img
            src={logo}
            alt="Crust - The Street Food"
            className="h-11 w-auto"
            style={{ imageRendering: "-webkit-optimize-contrast" }}
          />
        </div>

        <nav className="flex md:flex-col gap-2 flex-1 md:flex-none">
          <NavItem href="/" icon={<LayoutDashboard className="w-6 h-6 mb-1" />} label="POS" active={location === "/"} />
          <NavItem href="/history" icon={<ReceiptText className="w-6 h-6 mb-1" />} label="Orders" active={location === "/history"} />
          <NavItem href="/settings" icon={<SettingsIcon className="w-6 h-6 mb-1" />} label="Admin" active={location === "/settings"} />
          {user?.role === "admin" && (
            <NavItem href="/employees" icon={<Users className="w-6 h-6 mb-1" />} label="Staff" active={location === "/employees"} />
          )}
          {user?.role === "admin" && (
            <NavItem href="/menu" icon={<UtensilsCrossed className="w-6 h-6 mb-1" />} label="Menu" active={location === "/menu"} />
          )}
        </nav>

        {/* Logout at the bottom on desktop */}
        <div className="hidden md:flex flex-col items-center mt-auto pb-2 gap-2">
          {user && (
            <div className="text-[10px] text-center text-sidebar-foreground/50 leading-tight max-w-[72px] truncate px-1">
              {user.fullName}
            </div>
          )}
          <button
            onClick={handleLogout}
            title="Sign out"
            className="flex flex-col items-center justify-center w-16 h-16 rounded-xl cursor-pointer transition-all hover:bg-destructive/20 text-sidebar-foreground/60 hover:text-destructive"
          >
            <LogOut className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Logout</span>
          </button>
        </div>

        {/* Logout in mobile nav bar */}
        <button
          onClick={handleLogout}
          className="md:hidden flex flex-col items-center justify-center w-16 h-16 rounded-xl cursor-pointer transition-all hover:bg-destructive/20 text-sidebar-foreground/60 hover:text-destructive"
          title="Sign out"
        >
          <LogOut className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Logout</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link href={href}>
      <div className={cn(
        "flex flex-col items-center justify-center w-16 h-16 rounded-xl cursor-pointer transition-all hover:bg-accent",
        active ? "bg-primary text-primary-foreground shadow-sm" : "text-sidebar-foreground/60"
      )}>
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
    </Link>
  );
}
