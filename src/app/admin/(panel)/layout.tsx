"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import {
  Activity,
  BookOpenCheck,
  Building2,
  CalendarDays,
  ChevronRight,
  Database,
  FileText,
  GalleryHorizontalEnd,
  LayoutDashboard,
  Menu,
  Newspaper,
  Radio,
  Settings,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRoundCog,
  UsersRound,
  WifiOff,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useConvexConnectionState,
  useQuery,
} from "convex/react";
import Image from "next/image";
import {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { api } from "../../../../convex/_generated/api";

type NavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Przegląd",
    items: [
      { href: "/admin", label: "Pulpit", icon: LayoutDashboard },
      { href: "/admin/dane", label: "Centrum danych", icon: Database },
    ],
  },
  {
    label: "Treści",
    items: [
      { href: "/admin/articles", label: "Artykuły", icon: Newspaper },
      { href: "/admin/fb-posts", label: "Posty Facebook", shortLabel: "Posty FB", icon: Activity },
      { href: "/admin/galerie", label: "Galerie", icon: GalleryHorizontalEnd },
      { href: "/admin/dokumenty", label: "Dokumenty", icon: FileText },
    ],
  },
  {
    label: "Sport",
    items: [
      { href: "/admin/mecze", label: "Mecze", icon: CalendarDays },
      { href: "/admin/druzyny", label: "Drużyny", icon: Trophy },
      { href: "/admin/kadry", label: "Kadry", icon: UsersRound },
      { href: "/admin/live", label: "Transmisja live", icon: Radio },
    ],
  },
  {
    label: "Klub",
    items: [
      { href: "/admin/ludzie", label: "Ludzie", icon: UserRoundCog },
      { href: "/admin/sponsorzy", label: "Sponsorzy", icon: Building2 },
      { href: "/admin/regulamin", label: "Akceptacje regulaminu", shortLabel: "Akceptacje", icon: BookOpenCheck },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/ustawienia", label: "Ustawienia", icon: Settings },
    ],
  },
];

const allNavItems = navGroups.flatMap((group) => group.items);
const desktopMediaQuery = "(min-width: 1024px)";

function subscribeToDesktopViewport(callback: () => void) {
  const query = window.matchMedia(desktopMediaQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getDesktopViewportSnapshot() {
  return window.matchMedia(desktopMediaQuery).matches;
}

function isActivePath(pathname: string, href: string) {
  return href === "/admin"
    ? pathname === "/admin"
    : pathname === href || pathname.startsWith(`${href}/`);
}

function AdminNavigation({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <nav aria-label="Nawigacja panelu" className="flex-1 overflow-y-auto px-3 pb-5">
      {navGroups.map((group) => (
        <div key={group.label} className="mt-5 first:mt-2">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {group.label}
          </p>
          <div className="grid gap-1">
            {group.items.map((item) => {
              const active = isActivePath(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`group flex min-h-10 items-center gap-3 rounded-lg border-l-2 px-3 py-2 text-sm font-semibold transition-[background-color,color,border-color] duration-150 ${
                    active
                      ? "border-[#d8ff3e] bg-white/10 text-white"
                      : "border-transparent text-slate-300 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <Icon
                    aria-hidden="true"
                    size={18}
                    strokeWidth={1.8}
                    className={active ? "text-[#d8ff3e]" : "text-slate-400 group-hover:text-slate-200"}
                  />
                  <span>{item.shortLabel ?? item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function AdminLoadingState({ label = "Ładowanie panelu" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="grid animate-pulse gap-4">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="h-8 w-52 rounded-lg bg-[#e3e8ee]" />
      <div aria-hidden="true" className="h-4 w-80 max-w-full rounded bg-[#e8edf2]" />
      <div aria-hidden="true" className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-28 rounded-xl border border-[#e0e6ed] bg-white" />
        ))}
      </div>
    </div>
  );
}

function AdminAccessGate({ children }: { children: ReactNode }) {
  const access = useQuery(api.adminAccess.status);

  if (access === undefined) {
    return <AdminLoadingState label="Sprawdzanie uprawnień do panelu" />;
  }

  if (access.status === "authorized") {
    return children;
  }

  const message = {
    forbidden: {
      title: "Brak dostępu do panelu",
      detail: "To konto jest zalogowane, ale nie znajduje się na liście administratorów.",
    },
    misconfigured: {
      title: "Panel wymaga konfiguracji",
      detail: "Lista administratorów nie została ustawiona w środowisku Convex.",
    },
    missing_email: {
      title: "Nie można potwierdzić uprawnień",
      detail: "Token logowania nie przekazuje adresu e-mail wymaganego przez panel.",
    },
    unauthenticated: {
      title: "Sesja wygasła",
      detail: "Zaloguj się ponownie, aby wrócić do panelu.",
    },
  }[access.status];

  return (
    <div role="alert" className="mx-auto mt-16 max-w-lg rounded-xl border border-[#f0caca] bg-white p-7 text-center shadow-sm">
      <ShieldCheck aria-hidden="true" className="mx-auto text-[#b42318]" />
      <h1 className="mt-3 text-lg font-black text-[#14263a]">{message.title}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{message.detail}</p>
      <Link
        href="/"
        className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-[#183f63] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#24567f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#183f63]"
      >
        Wróć na stronę klubu
      </Link>
    </div>
  );
}

export default function AdminPanelLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useUser();
  const connectionState = useConvexConnectionState();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isDesktop = useSyncExternalStore(
    subscribeToDesktopViewport,
    getDesktopViewportSnapshot,
    () => false,
  );
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closeMobileNavigation = useCallback((restoreFocus = true) => {
    setMobileOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => menuButtonRef.current?.focus());
    }
  }, []);
  const handleNavigation = useCallback(() => {
    if (isDesktop) return;
    closeMobileNavigation(false);
    requestAnimationFrame(() => {
      document.getElementById("admin-content")?.focus();
    });
  }, [closeMobileNavigation, isDesktop]);
  const currentItem =
    [...allNavItems]
      .sort((a, b) => b.href.length - a.href.length)
      .find((item) => isActivePath(pathname, item.href)) ?? allNavItems[0];
  const isConnected = connectionState.isWebSocketConnected;
  const connectionLabel = isConnected
    ? "Dane na żywo"
    : connectionState.hasEverConnected
      ? "Ponowne łączenie"
      : "Łączenie z Convex";

  useEffect(() => {
    if (!mobileOpen || isDesktop) return;

    closeButtonRef.current?.focus();
    const navigation = document.getElementById("admin-navigation");
    const focusable = Array.from(
      navigation?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    );

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobileNavigation();
        return;
      }
      if (event.key !== "Tab" || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeMobileNavigation, isDesktop, mobileOpen]);

  useEffect(() => {
    const query = window.matchMedia(desktopMediaQuery);
    const closeWhenEnteringDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileOpen(false);
    };
    query.addEventListener("change", closeWhenEnteringDesktop);
    return () => query.removeEventListener("change", closeWhenEnteringDesktop);
  }, []);

  useEffect(() => {
    if (!mobileOpen || isDesktop) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isDesktop, mobileOpen]);

  return (
    <div className="admin-shell min-h-[100dvh] bg-[#f3f5f8] text-foreground lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <a
        href="#admin-content"
        className="fixed left-4 top-4 z-[70] -translate-y-24 rounded-lg bg-white px-4 py-2 text-sm font-bold text-[#14263a] shadow-lg focus:translate-y-0"
      >
        Przejdź do treści
      </a>

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Zamknij nawigację"
          className="fixed inset-0 z-40 bg-[#071725]/55 backdrop-blur-[2px] lg:hidden"
          onClick={() => closeMobileNavigation()}
        />
      ) : null}

      <aside
        id="admin-navigation"
        aria-hidden={!isDesktop && !mobileOpen ? true : undefined}
        aria-modal={!isDesktop && mobileOpen ? true : undefined}
        inert={!isDesktop && !mobileOpen}
        role={!isDesktop && mobileOpen ? "dialog" : undefined}
        aria-label={!isDesktop && mobileOpen ? "Menu panelu" : undefined}
        className={`fixed inset-y-0 left-0 z-50 flex w-[284px] max-w-[86vw] flex-col bg-[#102a43] text-white shadow-2xl transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] lg:sticky lg:top-0 lg:h-[100dvh] lg:w-auto lg:translate-x-0 lg:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[76px] shrink-0 items-center gap-3 border-b border-white/10 px-5">
          <Image
            src="/images/figma/crest-rks.png"
            alt="RKS Okęcie Warszawa"
            width={42}
            height={42}
            priority
            className="h-10 w-10 object-contain"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-black tracking-[-0.01em]">RKS Workspace</p>
            <p className="truncate text-xs text-slate-400">Panel zarządzania</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Zamknij menu"
            className="ml-auto grid h-9 w-9 place-items-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={() => closeMobileNavigation()}
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>
        <AdminNavigation
          pathname={pathname}
          onNavigate={handleNavigation}
        />
        <div className="shrink-0 border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.06] p-3">
            <UserButton
              appearance={{
                elements: { avatarBox: "h-9 w-9" },
              }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-white">
                {user?.fullName ?? "Administrator"}
              </p>
              <p className="truncate text-[11px] text-slate-400">
                {user?.primaryEmailAddress?.emailAddress ?? "Konto administracyjne"}
              </p>
            </div>
            <ShieldCheck aria-hidden="true" size={17} className="text-[#d8ff3e]" />
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-[76px] items-center gap-3 border-b border-[#dce3eb] bg-white/95 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <button
            ref={menuButtonRef}
            type="button"
            aria-label="Otwórz nawigację"
            aria-controls="admin-navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#dce3eb] bg-white text-[#1d3147] shadow-sm transition-colors hover:bg-[#f4f6f8] lg:hidden"
          >
            <Menu aria-hidden="true" size={20} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#617085]">
              <span>Panel</span>
              <ChevronRight aria-hidden="true" size={12} />
              <span className="truncate">{currentItem?.label}</span>
            </div>
            <p className="truncate text-sm font-black tracking-[-0.01em] text-[#14263a] sm:text-base">
              {currentItem?.label}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div
              role="status"
              aria-live="polite"
              className={`flex h-9 w-9 items-center justify-center gap-2 rounded-full border text-xs font-semibold sm:h-auto sm:w-auto sm:px-3 sm:py-1.5 ${
                isConnected
                  ? "border-[#dce3eb] bg-[#f7f9fb] text-[#536275]"
                  : "border-[#ead4b6] bg-[#fff8ed] text-[#815000]"
              }`}
            >
              {isConnected ? (
                <Sparkles aria-hidden="true" size={14} className="text-[#668000]" />
              ) : (
                <WifiOff aria-hidden="true" size={14} />
              )}
              <span className="sr-only sm:not-sr-only">{connectionLabel}</span>
            </div>
            <Link
              href="/"
              className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg border border-[#d5dde7] bg-white px-3 text-xs font-bold text-[#20364d] shadow-sm transition-[background-color,transform] duration-150 hover:bg-[#f4f6f8] active:scale-[0.98] sm:px-4 sm:text-sm"
            >
              Zobacz stronę
            </Link>
          </div>
        </header>

        <main id="admin-content" tabIndex={-1} className="admin-content mx-auto w-full max-w-[1480px] px-4 py-6 outline-none sm:px-6 sm:py-8 lg:px-8">
        {/* Zapytania stron panelu mogą ruszyć dopiero, gdy socket Convex ma
            token Clerk. Wcześniejsza subskrypcja leci bez tożsamości i
            requireAdmin ją odrzuca. */}
        <AuthLoading>
          <AdminLoadingState />
        </AuthLoading>
        <Unauthenticated>
          <div className="mx-auto mt-16 max-w-md rounded-xl border border-[#f0caca] bg-white p-6 text-center shadow-sm">
            <ShieldCheck aria-hidden="true" className="mx-auto text-[#b42318]" />
            <h1 className="mt-3 text-lg font-black text-[#14263a]">Sesja wygasła</h1>
            <p className="mt-2 text-sm text-muted-foreground">Zaloguj się ponownie, aby wrócić do panelu.</p>
            <Link href="/admin/sign-in" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-[#183f63] px-4 py-2 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#183f63]">
              Przejdź do logowania
            </Link>
          </div>
        </Unauthenticated>
        <Authenticated>
          <AdminAccessGate>{children}</AdminAccessGate>
        </Authenticated>
        </main>
      </div>
    </div>
  );
}
