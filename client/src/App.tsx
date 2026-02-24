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
import AuthPage from "./pages/AuthPage";
import ResetPassword from "./pages/ResetPassword";
import Settings from "./pages/Settings";
import Billing from "./pages/Billing";
import Landing from "./pages/Landing";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/birds" component={Birds} />
      <Route path="/birds/:id" component={BirdDetail} />
      <Route path="/pairs" component={Pairs} />
      <Route path="/broods" component={Broods} />
      <Route path="/events" component={Events} />
      <Route path="/settings" component={Settings} />
      <Route path="/billing" component={Billing} />
      <Route path="/login" component={AuthPage} />
      <Route path="/register" component={AuthPage} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/verify-email" component={AuthPage} />
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
