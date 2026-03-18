import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Suspense, lazy } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

const NotFound = lazy(() => import("@/pages/NotFound"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Birds = lazy(() => import("./pages/Birds"));
const BirdDetail = lazy(() => import("./pages/BirdDetail"));
const Pairs = lazy(() => import("./pages/Pairs"));
const Broods = lazy(() => import("./pages/Broods"));
const Events = lazy(() => import("./pages/Events"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Settings = lazy(() => import("./pages/Settings"));
const Billing = lazy(() => import("./pages/Billing"));
const Landing = lazy(() => import("./pages/Landing"));
const Cages = lazy(() => import("./pages/Cages"));
const Statistics = lazy(() => import("./pages/Statistics"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const Help = lazy(() => import("./pages/Help"));
const Marketing = lazy(() => import("./pages/Marketing"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));

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
      <Route path="/cages" component={Cages} />
      <Route path="/statistics" component={Statistics} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/settings" component={Settings} />
      <Route path="/billing" component={Billing} />
      <Route path="/help" component={Help} />
      <Route path="/marketing" component={Marketing} />
      <Route path="/login" component={AuthPage} />
      <Route path="/register" component={AuthPage} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/verify-email" component={AuthPage} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
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
          <Suspense fallback={<div>Loading...</div>}>
            <Router />
          </Suspense>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
