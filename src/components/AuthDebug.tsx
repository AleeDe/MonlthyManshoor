import { RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AuthDebug() {
  const { user, profile, isAdmin, refreshProfile } = useAuth();

  return (
    <div className="fixed bottom-4 right-4 bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-xl max-w-sm z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900">Auth Status</h3>
        <button
          onClick={refreshProfile}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh profile"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-2 text-sm">
        <div>
          <span className="font-semibold">User: </span>
          <span className={user ? 'text-green-600' : 'text-red-600'}>
            {user ? 'Logged in' : 'Not logged in'}
          </span>
        </div>
        {user && (
          <>
            <div>
              <span className="font-semibold">Email: </span>
              <span className="text-gray-700">{user.email}</span>
            </div>
            <div>
              <span className="font-semibold">User ID: </span>
              <span className="text-gray-700 text-xs break-all">{user.id}</span>
            </div>
          </>
        )}
        <div>
          <span className="font-semibold">Profile Loaded: </span>
          <span className={profile ? 'text-green-600' : 'text-red-600'}>
            {profile ? 'Yes' : 'No'}
          </span>
        </div>
        {profile && (
          <div>
            <span className="font-semibold">Profile Email: </span>
            <span className="text-gray-700">{profile.email}</span>
          </div>
        )}
        <div>
          <span className="font-semibold">Is Admin: </span>
          <span className={isAdmin ? 'text-green-600 font-bold' : 'text-red-600'}>
            {isAdmin ? 'YES' : 'NO'}
          </span>
        </div>
        {profile && (
          <div>
            <span className="font-semibold">Profile is_admin value: </span>
            <span className="text-gray-700">{String(profile.is_admin)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
