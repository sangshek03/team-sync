'use client';

import { useState, useEffect } from 'react';

interface Organization {
  id: string;
  name: string;
  slug: string;
}

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

interface Member {
  id: string;
  role: string;
  user_id: string;
  profiles: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface OwnerViewProps {
  profileId: string;
  onCreateOrg: () => void;
  onInvite: () => void;
  refreshTrigger?: number;
  onOrganizationChange?: (orgId: string | null) => void;
}

export default function OwnerView({ profileId, onCreateOrg, onInvite, refreshTrigger, onOrganizationChange }: OwnerViewProps) {
  const [activeTab, setActiveTab] = useState<'teams' | 'members'>('teams');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrganizations = async () => {
      setLoading(true);
      try {
        const orgRes = await fetch('/api/organization', { credentials: 'include' });
        const orgData = await orgRes.json();
        if (orgData.success) {
          const orgs = orgData.data || [];
          setOrganizations(orgs);
          // Auto-select first organization if available
          if (orgs.length > 0 && !selectedOrgId) {
            setSelectedOrgId(orgs[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching organizations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, [refreshTrigger]);

  useEffect(() => {
    const fetchOrgData = async () => {
      if (!selectedOrgId) {
        setTeams([]);
        setMembers([]);
        return;
      }

      try {
        // Fetch teams for selected organization
        const teamsRes = await fetch(`/api/teams?organization_id=${selectedOrgId}`, { credentials: 'include' });
        const teamsData = await teamsRes.json();
        if (teamsData.success) {
          setTeams(teamsData.data || []);
        }

        // Fetch members for selected organization
        const membersRes = await fetch(`/api/organization/members?organization_id=${selectedOrgId}`, { credentials: 'include' });
        const membersData = await membersRes.json();
        if (membersData.success) {
          setMembers(membersData.data || []);
        }
      } catch (error) {
        console.error('Error fetching organization data:', error);
      }
    };

    fetchOrgData();

    // Notify parent about organization change
    if (onOrganizationChange) {
      onOrganizationChange(selectedOrgId);
    }
  }, [selectedOrgId, refreshTrigger, onOrganizationChange]);

  const handleOrgChange = (orgId: string) => {
    setSelectedOrgId(orgId);
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={onCreateOrg}
          className="bg-white hover:bg-[#FFBDBD] border-2 border-[#FFA4A4] text-gray-800 font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span>Create Organization</span>
        </button>

        <button
          onClick={onInvite}
          disabled={!selectedOrgId}
          className="bg-white hover:bg-[#FFBDBD] border-2 border-[#FFA4A4] text-gray-800 font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span>Invite Members</span>
        </button>
      </div>

      {/* Organization Selector */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <label htmlFor="org-select" className="block text-sm font-medium text-gray-700 mb-2">
          Select Organization
        </label>
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#FFA4A4]"></div>
          </div>
        ) : organizations.length === 0 ? (
          <p className="text-gray-600 text-center py-4">No organizations found. Create one to get started!</p>
        ) : (
          <select
            id="org-select"
            value={selectedOrgId || ''}
            onChange={(e) => handleOrgChange(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFA4A4] focus:border-transparent transition-all duration-200 outline-none"
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name} ({org.slug})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Tabs - Only show if organization is selected */}
      {selectedOrgId && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('teams')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                activeTab === 'teams'
                  ? 'bg-[#FFA4A4] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Teams ({teams.length})
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                activeTab === 'members'
                  ? 'bg-[#FFA4A4] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Members ({members.length})
            </button>
          </div>

          <div className="p-6">
            {/* Teams Tab */}
            {activeTab === 'teams' && (
              <div className="space-y-4">
                {teams.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No teams found</p>
                ) : (
                  teams.map((team) => (
                    <div key={team.id} className="border border-gray-200 rounded-lg p-4 hover:bg-[#FCF9EA] transition-colors">
                      <h3 className="font-semibold text-lg text-gray-800">{team.name}</h3>
                      {team.description && <p className="text-sm text-gray-600 mt-1">{team.description}</p>}
                      {team.creator && (
                        <p className="text-xs text-gray-500 mt-2">
                          Created by: {team.creator.full_name}
                          {team.created_by === profileId && <span className="text-[#FFA4A4] font-semibold"> (You)</span>}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (
              <div className="space-y-4">
                {members.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No members found</p>
                ) : (
                  members.map((member) => (
                    <div key={member.id} className="border border-gray-200 rounded-lg p-4 hover:bg-[#FCF9EA] transition-colors flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-[#FFA4A4] flex items-center justify-center text-white font-semibold">
                          {member.profiles.full_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{member.profiles.full_name || 'Unknown'}</p>
                          <p className="text-sm text-gray-600 capitalize">{member.role}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
