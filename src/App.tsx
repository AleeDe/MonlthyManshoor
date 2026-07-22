import { useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useParams,
  useLocation,
  Navigate,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ArchivePage from './pages/ArchivePage';
import IssueDetailPage from './pages/IssueDetailPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';

// Bridge the pages' onNavigate(page, issueId) API onto router URLs
function useAppNavigate() {
  const navigate = useNavigate();
  return (page: string, issueId?: string) => {
    const path =
      page === 'home' ? '/' :
      page === 'archive' ? '/archive' :
      page === 'issue' && issueId ? `/issue/${issueId}` :
      page === 'admin' ? '/admin' :
      page === 'login' ? '/login' : '/';
    navigate(path);
  };
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

function CurrentPageFromPath(): string {
  const { pathname } = useLocation();
  if (pathname.startsWith('/archive')) return 'archive';
  if (pathname.startsWith('/issue')) return 'issue';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/login')) return 'login';
  return 'home';
}

function IssueRoute() {
  const { id } = useParams();
  const onNavigate = useAppNavigate();
  if (!id) return <Navigate to="/archive" replace />;
  return <IssueDetailPage issueId={id} onNavigate={onNavigate} />;
}

function AdminRoute() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/login" replace />;
  return <AdminPage />;
}

function LoginRoute() {
  const onNavigate = useAppNavigate();
  const { isAdmin } = useAuth();
  if (isAdmin) return <Navigate to="/admin" replace />;
  return <LoginPage onNavigate={onNavigate} />;
}

function AppShell() {
  const onNavigate = useAppNavigate();
  const currentPage = CurrentPageFromPath();

  return (
    <div className="min-h-screen bg-white">
      <ScrollToTop />
      <Navbar currentPage={currentPage} onNavigate={onNavigate} />
      <main>
        <Routes>
          <Route path="/" element={<HomePage onNavigate={onNavigate} />} />
          <Route path="/archive" element={<ArchivePage onNavigate={onNavigate} />} />
          <Route path="/issue/:id" element={<IssueRoute />} />
          <Route path="/admin" element={<AdminRoute />} />
          <Route path="/login" element={<LoginRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer onNavigate={onNavigate} />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
