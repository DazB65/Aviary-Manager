import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import { BarChart2, Bird, CalendarDays, CreditCard, Egg, Heart, HelpCircle, Home, LayoutDashboard, LogOut, Settings, Users, MapPin } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAppTour } from "@/hooks/useAppTour";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "./ui/sheet";
import { AIChatBox } from "./AIChatBox";

const mainMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Bird, label: "My Birds", path: "/birds" },
  { icon: Heart, label: "Breeding Pairs", path: "/pairs" },
  { icon: Egg, label: "Broods & Eggs", path: "/broods" },
  { icon: CalendarDays, label: "Events & Reminders", path: "/events" },
  { icon: Home, label: "Cages", path: "/cages" },
  { icon: BarChart2, label: "Statistics", path: "/statistics" },
  { icon: Settings, label: "Settings", path: "/settings" },
  { icon: CreditCard, label: "Billing", path: "/billing" },
  { icon: HelpCircle, label: "Help", path: "/help" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  if (loading || !user) {
    return <DashboardLayoutSkeleton />;
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = mainMenuItems.find(item => item.path === location);
  const isMobile = useIsMobile();
  const { data: settings } = trpc.settings.get.useQuery();
  const breedingYear = settings?.breedingYear ?? new Date().getFullYear();
  const isAdmin = user?.role === "admin";
  const isPro = user?.plan === "pro";
  const { startTour, maybeStartTour, hasTourBeenSkipped } = useAppTour();
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    maybeStartTour();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="p-0 overflow-hidden">
            <button
              onClick={toggleSidebar}
              className="w-full flex items-center justify-center hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Toggle navigation"
            >
              <img
                src="/logo.svg"
                alt="Aviary Manager"
                className="w-full h-auto object-contain"
              />
            </button>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            {/* Breeding Season section */}
            {!isCollapsed && (
              <div className="px-4 py-2 border-b border-border/50">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Breeding Season</p>
                <button
                  onClick={() => setLocation("/settings")}
                  className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  <span>🐦</span>
                  <span>{breedingYear} Season</span>
                </button>
              </div>
            )}
            <SidebarMenu className="px-2 py-1">
              {mainMenuItems.map(item => {
                const isActive = location === item.path;
                const tourId = `tour-nav-${item.path.replace("/", "")}`;
                return (
                  <SidebarMenuItem key={item.path} id={tourId}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal text-base`}
                    >
                      <item.icon
                        className={`h-5 w-5 ${isActive ? "text-primary" : ""}`}
                      />
                      <span className="text-base">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
            {/* Admin section */}
            {isAdmin && (
              <div className="px-2 pb-1">
                {!isCollapsed && (
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-2 py-1">Admin</p>
                )}
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={location === "/admin/users"}
                      onClick={() => setLocation("/admin/users")}
                      tooltip="Admin: Users"
                      className="h-10 transition-all font-normal"
                    >
                      <Users className={`h-4 w-4 ${location === "/admin/users" ? "text-primary" : ""}`} />
                      <span>Admin: Users</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </div>
            )}
          </SidebarContent>

          <SidebarFooter className="p-3">
            {/* AI Assistant button */}
            <button
              id="tour-ai-fab"
              onClick={() => setAiOpen(true)}
              className="w-full flex items-center justify-center hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-ring mb-1"
              aria-label="Open Aviary Assistant"
            >
              <img src="/aviary-assistant.svg" alt="Aviary Assistant" className="w-full h-auto object-contain" />
            </button>
            {!isCollapsed && (
              <button
                onClick={startTour}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors mb-1"
              >
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>Take the tour</span>
                {hasTourBeenSkipped() && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-primary shrink-0" title="You skipped the tour — click to restart" />
                )}
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate leading-none">
                        {user?.name || "-"}
                      </p>
                      {isPro && (
                        <Badge className="text-[10px] px-1 py-0 h-4 bg-yellow-400 text-yellow-900 hover:bg-yellow-400 shrink-0">Pro</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "Menu"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>

      {/* AI Assistant Sheet */}
      <Sheet open={aiOpen} onOpenChange={setAiOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0 flex flex-col border-l">
          <div className="flex bg-primary/10 p-4 items-center gap-3 border-b">
            <img src="/logo-color.svg" alt="Aviary Manager" className="h-10 w-10 object-contain shrink-0" />
            <div>
              <SheetTitle className="text-lg">Aviary Assistant</SheetTitle>
              <SheetDescription className="text-xs">
                Ask questions about your flock, upcoming events, and stats.
              </SheetDescription>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            {user && (
              <AIChatBox
                chatId={`assistant-global-${user.id}`}
                initialMessages={[]}
                api="/api/chat"
                placeholder="Message your Aviary Assistant..."
                className="h-full border-0 rounded-none shadow-none"
                emptyStateMessage="Hello! I'm your AI Aviary Assistant. I can help you search birds, check flock stats, or review upcoming events."
                suggestedPrompts={[
                  "What's my total flock size?",
                  "Show me my upcoming events",
                  "Search for birds that are breeding",
                ]}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
