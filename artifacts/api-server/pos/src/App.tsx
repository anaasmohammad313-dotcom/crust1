import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import TakeOrder from '@/pages/take-order';
import OrderHistory from '@/pages/order-history';
import Settings from '@/pages/settings';
import Employees from '@/pages/employees';
import MenuEditor from '@/pages/menu-editor';
import Login from '@/pages/login';
import ForgotPassword from '@/pages/forgot-password';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';
import { Layout } from '@/components/layout';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';

const queryClient = new QueryClient();

function ProtectedRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route><Redirect to="/login" /></Route>
      </Switch>
    );
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={TakeOrder} />
        <Route path="/history" component={OrderHistory} />
        <Route path="/settings" component={Settings} />
        <Route path="/employees" component={Employees} />
        <Route path="/menu" component={MenuEditor} />
        <Route path="/login"><Redirect to="/" /></Route>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AuthProvider>
            <ProtectedRouter />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
