import { Facebook, Twitter, Instagram, Youtube, BookOpen, KeyRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface FooterProps {
  onNavigate: (page: string) => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    { label: 'Home', page: 'home' },
    { label: 'Archive', page: 'archive' },
    { label: 'Admin Setup Guide', page: 'setup' },
    { label: 'Contact', page: 'home' },
    { label: 'Privacy Policy', page: 'home' }
  ];

  const socialLinks = [
    { icon: Facebook, label: 'Facebook', href: '#' },
    { icon: Twitter, label: 'Twitter', href: '#' },
    { icon: Instagram, label: 'Instagram', href: '#' },
    { icon: Youtube, label: 'YouTube', href: 'https://youtube.com/@podcastwithkamran?si=TeBJ_R5vksGoSrXk' }
  ];

  return (
    <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 rounded-xl">
                <img src="/logo.png" alt="Magazine Archive logo" className="w-8 h-8 object-cover rounded" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Magazine Archive</h3>
                <p className="text-sm text-gray-400 font-urdu">میگزین آرکائیو</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Preserving 61 years of literary excellence and cultural heritage through our digital archive.
            </p>
            <p className="text-gray-400 text-sm font-urdu mt-2 leading-relaxed" dir="rtl">
              61 سال کی ادبی عظمت اور ثقافتی ورثے کو ڈیجیٹل آرکائیو کے ذریعے محفوظ کرنا
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {footerLinks.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => onNavigate(link.page)}
                    className="text-gray-400 hover:text-white transition-colors duration-300 text-sm"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Connect With Us</h4>
            <div className="flex gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="bg-gray-800 p-3 rounded-xl hover:bg-red-600 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-red-600/30"
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 w-full">
          <p className="text-gray-400 text-sm">
            © {currentYear} Magazine Archive. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            <p className="text-gray-400 text-sm font-urdu" dir="rtl">
              تمام حقوق محفوظ ہیں
            </p>
            {!user && (
              <button
                onClick={() => onNavigate('login')}
                className="group ml-2 text-gray-500/20 hover:text-gray-300 transition-colors text-xs flex items-center gap-1"
                title="Admin Login"
                aria-label="Admin Login"
              >
                <KeyRound className="w-3 h-3 opacity-30 group-hover:opacity-80 transition-opacity" />
                <span className="opacity-0 group-hover:opacity-80 transition-opacity">Login</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
