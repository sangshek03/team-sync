'use client';

import { useState, useEffect } from 'react';

interface InviteMembersModalProps {
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  userRole: 'owner' | 'admin' | 'member';
  organizationId: string;
}

interface Team {
  id: string;
  name: string;
}

export default function InviteMembersModal({ onClose, onSuccess, onError, userRole, organizationId }: InviteMembersModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [teamId, setTeamId] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch teams for the organization
    const fetchTeams = async () => {
      try {
        const response = await fetch(`/api/teams?organization_id=${organizationId}`, {
          credentials: 'include',
        });
        const data = await response.json();
        if (data.success) {
          setTeams(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch teams:', err);
      }
    };

    fetchTeams();
  }, [organizationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name,
          email,
          role,
          team_id: teamId || undefined,
          organization_id: organizationId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onSuccess('Invitation sent successfully!');
      } else {
        onError(data.message || 'Failed to send invitation');
      }
    } catch (err) {
      onError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-yellow-900/20 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 animate-slideUp">
        {/* Header */}
        <div className="bg-[#FFA4A4] text-white px-6 py-4 rounded-t-2xl flex justify-between items-center">
          <h2 className="text-xl font-bold">Invite Member</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label htmlFor="memberName" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              id="memberName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFA4A4] focus:border-transparent transition-all duration-200 outline-none"
              placeholder="Enter member name"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="memberEmail" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="memberEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFA4A4] focus:border-transparent transition-all duration-200 outline-none"
              placeholder="member@example.com"
            />
          </div>

          {/* Role - Only show dropdown for owner */}
          {userRole === 'owner' && (
            <div className="space-y-2">
              <label htmlFor="memberRole" className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                id="memberRole"
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFA4A4] focus:border-transparent transition-all duration-200 outline-none"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}

          {/* Team - Optional */}
          <div className="space-y-2">
            <label htmlFor="team" className="block text-sm font-medium text-gray-700">
              Team (Optional)
            </label>
            <select
              id="team"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFA4A4] focus:border-transparent transition-all duration-200 outline-none"
            >
              <option value="">No Team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-all duration-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#FFA4A4] hover:bg-[#FFBDBD] text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
