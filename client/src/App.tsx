import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Birds from "./pages/Birds";
import BirdDetail from "./pages/BirdDetail";
import Pairs from "./pages/Pairs";
import Broods from "./pages/Broods";
import Events from "./pages/Events";
import Login from "./pages/Login";
import Settings from "./pages/Settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/birds" component={Birds} />
      <Route path="/birds/:id" component={BirdDetail} />
      <Route path="/pairs" component={Pairs} />
      <Route path="/broods" component={Broods} />
      <Route path="/events" component={Events} />
      <Route path="/settings" component={Settings} />
      <Route path="/login" component={Login} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
