'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CreateOrganizationModal from '@/components/CreateOrganizationModal';
import InviteMembersModal from '@/components/InviteMembersModal';
import CreateTeamModal from '@/components/CreateTeamModal';
import ActivityLogs from '@/components/ActivityLogs';
import OwnerView from '@/components/OwnerView';
import AdminView from '@/components/AdminView';
import MemberView from '@/components/MemberView';
import Toast from '@/components/Toast';

interface UserData {
  profile_id: string;
  full_name: string;
  role: 'owner' | 'admin' | 'member';
  organization_id: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (!response.ok) {
          router.push('/login');
          return;
        }

        const data = await response.json();
        setUserData(data.data);
      } catch (error) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCF9EA]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFA4A4]"></div>
      </div>
    );
  }

  if (!userData) return null;

  // Show create organization prompt if owner has no organization
  // if (userData.role === 'owner' && userData.organization_id) {
  //   return (
  //     <div className="min-h-screen bg-[#FCF9EA] flex items-center justify-center p-4">
  //       <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center transform transition-all duration-300 hover:shadow-2xl">
  //         <h1 className="text-3xl font-bold text-gray-800 mb-4">Welcome, {userData.full_name}!</h1>
  //         <p className="text-gray-600 mb-8">Get started by creating your organization</p>
  //         <button
  //           onClick={() => setShowCreateOrgModal(true)}
  //           className="w-full bg-[#FFA4A4] hover:bg-[#FFBDBD] text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
  //         >
  //           Create Organization
  //         </button>
  //       </div>
  //       {showCreateOrgModal && (
  //         <CreateOrganizationModal
  //           onClose={() => setShowCreateOrgModal(false)}
  //           onSuccess={() => window.location.reload()}
  //         />
  //       )}
  //     </div>
  //   );
  // }

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#FCF9EA]">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-sm text-gray-600">Welcome back, {userData.full_name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-[#FFA4A4] hover:bg-[#FFBDBD] text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side - Role-based Views */}
          <div>
            {userData.role === 'owner' && (
              <OwnerView
                profileId={userData.profile_id}
                onCreateOrg={() => setShowCreateOrgModal(true)}
                onInvite={() => setShowInviteModal(true)}
                refreshTrigger={refreshTrigger}
              />
            )}

            {userData.role === 'admin' && (
              <AdminView
                organizationId={userData.organization_id!}
                profileId={userData.profile_id}
                onCreateTeam={() => setShowCreateTeamModal(true)}
                onInvite={() => setShowInviteModal(true)}
                refreshTrigger={refreshTrigger}
              />
            )}

            {userData.role === 'member' && (
              <MemberView
                organizationId={userData.organization_id!}
                profileId={userData.profile_id}
              />
            )}
          </div>

          {/* Right Side - Activity Logs */}
          <div>
            <ActivityLogs organizationId={userData.organization_id} />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreateOrgModal && (
        <CreateOrganizationModal
          onClose={() => setShowCreateOrgModal(false)}
          onSuccess={(message) => {
            setShowCreateOrgModal(false);
            setToast({ message, type: 'success' });
            handleRefresh();
          }}
          onError={(message) => {
            setToast({ message, type: 'error' });
          }}
        />
      )}

      {showInviteModal && (
        <InviteMembersModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={(message) => {
            setShowInviteModal(false);
            setToast({ message, type: 'success' });
            handleRefresh();
          }}
          onError={(message) => {
            setToast({ message, type: 'error' });
          }}
          userRole={userData.role}
          organizationId={userData.organization_id!}
        />
      )}

      {showCreateTeamModal && (
        <CreateTeamModal
          onClose={() => setShowCreateTeamModal(false)}
          onSuccess={(message) => {
            setShowCreateTeamModal(false);
            setToast({ message, type: 'success' });
            handleRefresh();
          }}
          onError={(message) => {
            setToast({ message, type: 'error' });
          }}
        />
      )}
    </div>
  );
}
