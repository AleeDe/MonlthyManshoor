import { Menu, X, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const { user, isAdmin, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    onNavigate('home');
  };

  const baseNavItems = [
    { id: 'home', label: 'Home', labelUrdu: 'ہوم' },
    { id: 'archive', label: 'Archive', labelUrdu: 'آرکائیو' }
  ];

  // Do not show Login in navbar to general public; only show Admin tab when user is admin
  const navItems = isAdmin
    ? [...baseNavItems, { id: 'admin', label: 'Admin', labelUrdu: 'ایڈمن' }]
    : baseNavItems;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 group"
          >
            <img
              src="/Generated Image October 14, 2025 - 3_35PM.png"
              alt="Magazine Logo"
              className="h-16 w-auto object-contain group-hover:scale-105 transition-transform duration-300"
            />
          </button>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-6 py-2 rounded-xl font-medium transition-all duration-300 ${
                  currentPage === item.id
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="block">{item.label}</span>
                <span className="block text-xs font-urdu">{item.labelUrdu}</span>
              </button>
            ))}
            {user && (
              <button
                onClick={handleSignOut}
                className="ml-2 px-4 py-2 rounded-xl font-medium text-gray-700 hover:bg-gray-100 transition-all duration-300 flex items-center gap-2"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 py-4 px-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                currentPage === item.id
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="block">{item.label}</span>
              <span className="block text-xs font-urdu">{item.labelUrdu}</span>
            </button>
          ))}
          {user && (
            <button
              onClick={() => {
                handleSignOut();
                setMobileMenuOpen(false);
              }}
              className="w-full px-6 py-3 rounded-xl font-medium text-gray-700 hover:bg-gray-100 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
