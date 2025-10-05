import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AuthDebug from './components/AuthDebug';
import HomePage from './pages/HomePage';
import ArchivePage from './pages/ArchivePage';
import IssueDetailPage from './pages/IssueDetailPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import AdminSetupPage from './pages/AdminSetupPage';

function AppContent() {
  const { isAdmin, loading, user } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [selectedIssueId, setSelectedIssueId] = useState<string>('');

  const handleNavigate = (page: string, issueId?: string) => {
    if (page === 'admin') {
      if (!user) {
        setCurrentPage('login');
        return;
      }
      if (!isAdmin) {
        alert('Access denied. Admin privileges required.');
        return;
      }
    }

    setCurrentPage(page);
    if (issueId) {
      setSelectedIssueId(issueId);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar currentPage={currentPage} onNavigate={handleNavigate} />

      <main>
        {currentPage === 'home' && <HomePage onNavigate={handleNavigate} />}
        {currentPage === 'archive' && <ArchivePage onNavigate={handleNavigate} />}
        {currentPage === 'issue' && (
          <IssueDetailPage issueId={selectedIssueId} onNavigate={handleNavigate} />
        )}
        {currentPage === 'admin' && isAdmin && <AdminPage />}
        {currentPage === 'login' && <LoginPage onNavigate={handleNavigate} />}
        {currentPage === 'setup' && <AdminSetupPage onNavigate={handleNavigate} />}
      </main>

      <Footer onNavigate={handleNavigate} />
      
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
