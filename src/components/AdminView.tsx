'use client';

import { useState, useEffect } from 'react';
import Toast from './Toast';

interface Team {
  id: string;
  name: string;
  description: string;
  created_by: string;
  creator?: {
    id: string;
    full_name: string;
  };
}

interface TeamMember {
  id: string;
  role: string;
  user_id: string;
  profiles: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface OrgMember {
  id: string;
  role: string;
  user_id: string;
  profiles: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface Invite {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  inviter_id: string;
}

interface AdminViewProps {
  organizationId: string;
  profileId: string;
  onCreateTeam: () => void;
  onInvite: () => void;
  refreshTrigger?: number;
}

export default function AdminView({ organizationId, profileId, onCreateTeam, onInvite, refreshTrigger }: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<'organization' | 'teams' | 'members' | 'invites'>('organization');
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<Record<string, TeamMember[]>>({});
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    memberId: string;
    oldRole: string;
    newRole: string;
    memberName: string;
  } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch organization
      const orgRes = await fetch('/api/organization', { credentials: 'include' });
      const orgData = await orgRes.json();
      if (orgData.success && orgData.data.length > 0) {
        setOrganization(orgData.data[0]);
      }

      // Fetch teams
      const teamsRes = await fetch('/api/teams', { credentials: 'include' });
      const teamsData = await teamsRes.json();
      if (teamsData.success) {
        setTeams(teamsData.data || []);

        // Fetch members for each team
        const membersPromises = (teamsData.data || []).map(async (team: Team) => {
          const res = await fetch(`/api/teams/${team.id}/members`, { credentials: 'include' });
          const data = await res.json();
          return { teamId: team.id, members: data.success ? data.data : [] };
        });

        const membersResults = await Promise.all(membersPromises);
        const membersMap: Record<string, TeamMember[]> = {};
        membersResults.forEach(({ teamId, members }) => {
          membersMap[teamId] = members;
        });
        setTeamMembers(membersMap);
      }

      // Fetch organization members
      const membersRes = await fetch('/api/organization/members', { credentials: 'include' });
      const membersData = await membersRes.json();
      if (membersData.success) {
        setOrgMembers(membersData.data || []);
      }

      // Fetch invites
      const invitesRes = await fetch('/api/invite', { credentials: 'include' });
      const invitesData = await invitesRes.json();
      if (invitesData.success) {
        setInvites(invitesData.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [organizationId, refreshTrigger]);

  const handleRoleChangeRequest = (memberId: string, oldRole: string, newRole: string, memberName: string) => {
    // If same role selected, do nothing
    if (oldRole === newRole) {
      return;
    }

    // Store pending change and show confirmation modal
    setPendingRoleChange({ memberId, oldRole, newRole, memberName });
    setShowConfirmModal(true);
  };

  const handleConfirmRoleChange = async () => {
    if (!pendingRoleChange) return;

    const { memberId, newRole, memberName } = pendingRoleChange;

    try {
      const response = await fetch(`/api/organization/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      if (data.success) {
        setToast({ message: `Successfully changed ${memberName}'s role to ${newRole}`, type: 'success' });
        fetchData(); // Refresh data
      } else {
        setToast({ message: data.message || 'Failed to change role', type: 'error' });
      }
    } catch (_error) {
      setToast({ message: 'An error occurred while changing role', type: 'error' });
    } finally {
      setShowConfirmModal(false);
      setPendingRoleChange(null);
    }
  };

  const handleCancelRoleChange = () => {
    setShowConfirmModal(false);
    setPendingRoleChange(null);
  };

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={onCreateTeam}
          className="bg-white hover:bg-[#FFBDBD] border-2 border-[#FFA4A4] text-gray-800 font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>Create Team</span>
        </button>

        <button
          onClick={onInvite}
          className="bg-white hover:bg-[#FFBDBD] border-2 border-[#FFA4A4] text-gray-800 font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span>Invite Members</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('organization')}
            className={`flex-1 py-4 px-6 font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'organization'
                ? 'bg-[#FFA4A4] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Organization
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`flex-1 py-4 px-6 font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'teams'
                ? 'bg-[#FFA4A4] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Teams ({teams.length})
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-4 px-6 font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'members'
                ? 'bg-[#FFA4A4] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Members ({orgMembers.length})
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`flex-1 py-4 px-6 font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'invites'
                ? 'bg-[#FFA4A4] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Invites ({invites.length})
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FFA4A4]"></div>
            </div>
          ) : (
            <>
              {/* Organization Tab */}
              {activeTab === 'organization' && (
                <div>
                  {organization ? (
                    <div className="border border-gray-200 rounded-lg p-4 hover:bg-[#FCF9EA] transition-colors">
                      <h3 className="font-semibold text-lg text-gray-800">{organization.name}</h3>
                      <p className="text-sm text-gray-600">Slug: {organization.slug}</p>
                    </div>
                  ) : (
                    <p className="text-gray-600 text-center py-8">No organization found</p>
                  )}
                </div>
              )}

              {/* Teams Tab */}
              {activeTab === 'teams' && (
                <div className="space-y-4">
                  {teams.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">No teams found</p>
                  ) : (
                    teams.map((team) => (
                      <div key={team.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div
                          className="p-4 bg-gray-50 cursor-pointer hover:bg-[#FCF9EA] transition-colors"
                          onClick={() => setSelectedTeam(selectedTeam === team.id ? null : team.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-lg text-gray-800">
                                {team.name}
                                {team.created_by === profileId && (
                                  <span className="ml-2 text-xs bg-[#FFA4A4] text-white px-2 py-1 rounded">
                                    Created by you
                                  </span>
                                )}
                              </h3>
                              {team.description && <p className="text-sm text-gray-600 mt-1">{team.description}</p>}
                            </div>
                            <svg
                              className={`w-5 h-5 text-gray-600 transition-transform ${
                                selectedTeam === team.id ? 'transform rotate-180' : ''
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>

                        {selectedTeam === team.id && (
                          <div className="p-4 bg-white border-t border-gray-200">
                            <h4 className="font-semibold text-sm text-gray-700 mb-3">
                              Members ({teamMembers[team.id]?.length || 0})
                            </h4>
                            {teamMembers[team.id]?.length > 0 ? (
                              <div className="space-y-2">
                                {teamMembers[team.id].map((member) => (
                                  <div key={member.id} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50">
                                    <div className="w-8 h-8 rounded-full bg-[#FFA4A4] flex items-center justify-center text-white text-sm font-semibold">
                                      {member.profiles.full_name?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-800">{member.profiles.full_name || 'Unknown'}</p>
                                      <p className="text-xs text-gray-600 capitalize">{member.role}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600">No members in this team</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Members Tab */}
              {activeTab === 'members' && (
                <div className="space-y-4">
                  {orgMembers.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">No members found</p>
                  ) : (
                    orgMembers.map((member) => (
                      <div key={member.id} className="border border-gray-200 rounded-lg p-4 hover:bg-[#FCF9EA] transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-[#FFA4A4] flex items-center justify-center text-white font-semibold">
                              {member.profiles.full_name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">{member.profiles.full_name || 'Unknown'}</p>
                              <p className="text-sm text-gray-600 capitalize">{member.role}</p>
                            </div>
                          </div>
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChangeRequest(member.id, member.role, e.target.value, member.profiles.full_name)}
                            disabled={member.role === 'owner'}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFA4A4] focus:border-transparent transition-all duration-200 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="owner" disabled>Owner</option>
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Invites Tab */}
              {activeTab === 'invites' && (
                <div className="space-y-4">
                  {invites.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">No pending invites</p>
                  ) : (
                    invites.map((invite) => (
                      <div key={invite.id} className="border border-gray-200 rounded-lg p-4 hover:bg-[#FCF9EA] transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-800">{invite.email}</p>
                            <p className="text-sm text-gray-600">
                              Role: <span className="capitalize">{invite.role}</span>
                              {invite.inviter_id === profileId && (
                                <span className="ml-2 text-xs bg-[#FFA4A4] text-white px-2 py-1 rounded">Sent by you</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(invite.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full capitalize">
                            {invite.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && pendingRoleChange && (
        <div className="fixed inset-0 bg-yellow-900/20 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 animate-slideUp">
            {/* Header */}
            <div className="bg-[#FFA4A4] text-white px-6 py-4 rounded-t-2xl">
              <h2 className="text-xl font-bold">Confirm Role Change</h2>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <p className="text-gray-800">
                Are you sure you want to change <span className="font-semibold">{pendingRoleChange.memberName}</span>&apos;s role from{' '}
                <span className="font-semibold capitalize">{pendingRoleChange.oldRole}</span> to{' '}
                <span className="font-semibold capitalize">{pendingRoleChange.newRole}</span>?
              </p>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleCancelRoleChange}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRoleChange}
                  className="flex-1 bg-[#FFA4A4] hover:bg-[#FFBDBD] text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
