import { useState } from 'react';
import { Shield, Copy, CheckCircle, Terminal } from 'lucide-react';

interface AdminSetupPageProps {
  onNavigate: (page: string) => void;
}

export default function AdminSetupPage({ onNavigate }: AdminSetupPageProps) {
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const sqlQuery = email
    ? `UPDATE user_profiles SET is_admin = true WHERE email = '${email}';`
    : `UPDATE user_profiles SET is_admin = true WHERE email = 'your-email@example.com';`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Admin Setup Guide
            </h1>
            <p className="text-gray-600">
              Follow these steps to create your first admin user
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full text-sm font-bold">
                  1
                </span>
                Create a User Account
              </h2>
              <p className="text-blue-800 mb-4">
                First, you need to sign up for a regular user account:
              </p>
              <button
                onClick={() => onNavigate('login')}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Go to Sign Up / Login
              </button>
            </div>

            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-green-900 mb-4 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full text-sm font-bold">
                  2
                </span>
                Access Supabase Dashboard
              </h2>
              <p className="text-green-800 mb-3">
                Open your Supabase project dashboard:
              </p>
              <a
                href={supabaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors"
              >
                Open Supabase Dashboard
              </a>
              <p className="text-sm text-green-700 mt-3">
                URL: {supabaseUrl}
              </p>
            </div>

            <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 bg-purple-600 text-white rounded-full text-sm font-bold">
                  3
                </span>
                Run SQL Query
              </h2>
              <p className="text-purple-800 mb-4">
                In Supabase Dashboard, go to: <strong>SQL Editor</strong> and run this query:
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-purple-800 mb-2">
                  Enter your email (the one you signed up with):
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  className="w-full px-4 py-3 rounded-xl border-2 border-purple-200 focus:border-purple-600 focus:outline-none transition-colors"
                />
              </div>

              <div className="bg-gray-900 text-green-400 p-4 rounded-xl font-mono text-sm relative">
                <Terminal className="w-4 h-4 inline mr-2" />
                <pre className="overflow-x-auto">{sqlQuery}</pre>
                <button
                  onClick={handleCopy}
                  className="absolute top-4 right-4 bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition-colors"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-orange-900 mb-4 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 bg-orange-600 text-white rounded-full text-sm font-bold">
                  4
                </span>
                Access Admin Panel
              </h2>
              <p className="text-orange-800 mb-4">
                After running the SQL query, refresh the page and you'll see the "Admin" link in the navigation bar.
              </p>
              <button
                onClick={() => onNavigate('admin')}
                className="bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors"
              >
                Try Accessing Admin Panel
              </button>
            </div>

            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
              <h3 className="font-semibold text-red-900 mb-2">Alternative: Using SQL Editor Steps</h3>
              <ol className="text-sm text-red-800 space-y-2 list-decimal list-inside">
                <li>Sign up for an account using the Login page</li>
                <li>Go to Supabase Dashboard</li>
                <li>Click on "SQL Editor" in the left sidebar</li>
                <li>Click "New query"</li>
                <li>Paste the SQL query from above</li>
                <li>Click "Run" or press Ctrl/Cmd + Enter</li>
                <li>Refresh your app and click "Admin" in the navbar</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
