import { Toaster as ShadcnToaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Landing from './pages/Landing';
import RoleRouter from './pages/RoleRouter';
import CustomerLayout from './components/CustomerLayout';
import TherapistLayout from './components/TherapistLayout';
import AdminLayout from './components/AdminLayout';
import CustomerDashboard from './pages/CustomerDashboard';
import TherapistDashboard from './pages/TherapistDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminApprovals from './pages/AdminApprovals';
import AdminUsers from './pages/AdminUsers';
import Sessions from './pages/Sessions';
import Payments from './pages/Payments';
import SettingsPage from './pages/SettingsPage';
import TherapistCalendar from './pages/TherapistCalendar';
import BlogPage from './pages/BlogPage';
import AboutPage from './pages/AboutPage';
import AdminBlog from './pages/AdminBlog';
import AdminAboutUs from './pages/AdminAboutUs';
import AdminFees from './pages/AdminFees';
import BlogPostPage from './pages/BlogPostPage';
import AdminRevenue from './pages/AdminRevenue';
import TherapistPending from './pages/TherapistPending';
import TherapySelection from './pages/TherapySelection';
import TalkFreelyFlow from './pages/TalkFreelyFlow';
import FindSupportFlow from './pages/FindSupportFlow';
import TherapistPublicProfile from './pages/TherapistPublicProfile';
import CompleteProfile from './pages/CompleteProfile';
import CustomerOnboarding from './pages/CustomerOnboarding';
import JoinSupportFlow from './pages/JoinSupportFlow';
import TherapistProfileEditor from './pages/TherapistProfileEditor';
import BookingPage from './pages/BookingPage';
import ChatPage from './pages/ChatPage';
import AdminSetupDatabase from './pages/AdminSetupDatabase';
import TherapistLanding from './pages/TherapistLanding';
import FreeSupportChat from './pages/FreeSupportChat';
import AdminFreeSupport from './pages/AdminFreeSupport';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/pending-approval" element={<TherapistPending />} />
      <Route path="/talk-freely" element={<TalkFreelyFlow />} />
      <Route path="/find-support" element={<FindSupportFlow />} />
      <Route path="/join-support" element={<JoinSupportFlow />} />
      <Route path="/therapist/:slug" element={<TherapistPublicProfile />} />
      <Route path="/therapist-landing" element={<TherapistLanding />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/blog/:slug" element={<BlogPostPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/home" element={<RoleRouter />} />
        <Route element={<CustomerLayout />}>
          <Route path="/dashboard" element={<CustomerDashboard />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/sessions" element={<Sessions />} />
        </Route>
        <Route element={<TherapistLayout />}>
          <Route path="/therapist" element={<TherapistDashboard />} />
          <Route path="/therapist/sessions" element={<Sessions />} />
          <Route path="/therapist/calendar" element={<TherapistCalendar />} />
          <Route path="/therapist/profile-editor" element={<TherapistProfileEditor />} />
        </Route>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/approvals" element={<AdminApprovals />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/sessions" element={<Sessions />} />
          <Route path="/admin/fees" element={<AdminFees />} />
          <Route path="/admin/revenue" element={<AdminRevenue />} />
          <Route path="/admin/blog" element={<AdminBlog />} />
          <Route path="/admin/about" element={<AdminAboutUs />} />
          <Route path="/admin/free-support" element={<AdminFreeSupport />} />
          <Route path="/admin/setup-database" element={<AdminSetupDatabase />} />
        </Route>
        <Route path="/find-therapist" element={<TherapySelection />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/customer-onboarding" element={<CustomerOnboarding />} />
        <Route path="/book" element={<BookingPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/free-chat" element={<FreeSupportChat />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        {/* Render standard shadcn Toaster */}
        <ShadcnToaster />
        {/* Render Sonner Toaster in the top-right corner to catch all toast.success calls */}
        <SonnerToaster position="top-right" richColors />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App