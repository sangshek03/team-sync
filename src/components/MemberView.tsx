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

interface MemberViewProps {
  organizationId: string;
  profileId: string;
}

export default function MemberView({ organizationId, profileId }: MemberViewProps) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<Record<string, TeamMember[]>>({});
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch organization
        const orgRes = await fetch('/api/organization', { credentials: 'include' });
        const orgData = await orgRes.json();
        if (orgData.success && orgData.data.length > 0) {
          setOrganization(orgData.data[0]);
        }

        // Fetch all teams
        const teamsRes = await fetch('/api/teams', { credentials: 'include' });
        const teamsData = await teamsRes.json();

        if (teamsData.success) {
          const allTeams = teamsData.data || [];

          // Find teams where the user is a member
          const teamsWithMembership = await Promise.all(
            allTeams.map(async (team: Team) => {
              const res = await fetch(`/api/teams/${team.id}/members`, { credentials: 'include' });
              const data = await res.json();
              const members = data.success ? data.data : [];
              const isMember = members.some((m: TeamMember) => m.user_id === profileId);

              return {
                team,
                members,
                isMember,
              };
            })
          );

          // Filter teams where user is a member
          const myTeams = teamsWithMembership
            .filter(({ isMember }) => isMember)
            .map(({ team }) => team);

          setUserTeams(myTeams);

          // Set team members
          const membersMap: Record<string, TeamMember[]> = {};
          teamsWithMembership.forEach(({ team, members, isMember }) => {
            if (isMember) {
              membersMap[team.id] = members;
            }
          });
          setTeamMembers(membersMap);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [organizationId, profileId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FFA4A4]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Organization Info */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Organization</h2>
        {organization ? (
          <div className="border border-gray-200 rounded-lg p-4 bg-[#FCF9EA]">
            <h3 className="font-semibold text-lg text-gray-800">{organization.name}</h3>
            <p className="text-sm text-gray-600">Slug: {organization.slug}</p>
          </div>
        ) : (
          <p className="text-gray-600 text-center py-4">No organization found</p>
        )}
      </div>

      {/* Teams & Members */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          My Teams ({userTeams.length})
        </h2>

        {userTeams.length === 0 ? (
          <p className="text-gray-600 text-center py-8">You are not a member of any team</p>
        ) : (
          <div className="space-y-4">
            {userTeams.map((team) => (
              <div key={team.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div
                  className="p-4 bg-gray-50 cursor-pointer hover:bg-[#FCF9EA] transition-colors"
                  onClick={() => setSelectedTeam(selectedTeam === team.id ? null : team.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-800">{team.name}</h3>
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

                {/* Team Members */}
                {selectedTeam === team.id && (
                  <div className="p-4 bg-white border-t border-gray-200">
                    <h4 className="font-semibold text-sm text-gray-700 mb-3">
                      Team Members ({teamMembers[team.id]?.length || 0})
                    </h4>
                    {teamMembers[team.id]?.length > 0 ? (
                      <div className="space-y-2">
                        {teamMembers[team.id].map((member) => (
                          <div key={member.id} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50">
                            <div className="w-8 h-8 rounded-full bg-[#FFA4A4] flex items-center justify-center text-white text-sm font-semibold">
                              {member.profiles.full_name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">
                                {member.profiles.full_name || 'Unknown'}
                                {member.user_id === profileId && (
                                  <span className="ml-2 text-xs text-[#FFA4A4]">(You)</span>
                                )}
                              </p>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
