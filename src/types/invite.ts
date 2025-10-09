export type InviteRole = 'admin' | 'member';
export type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface CreateInvitePayload {
  email: string;
  name: string;
  role: InviteRole;
  organization_id: string; // Required to specify which organization the invite is for
  team_id?: string; // Optional: only for team member invites
}

export interface Invite {
  id: string;
  organization_id: string;
  inviter_id: string;
  email: string;
  role: InviteRole;
  token: string;
  status: InviteStatus;
  expires_at: string;
  created_at: string;
}

export interface InviteResponse {
  success: boolean;
  message: string;
  data?: Invite;
}

export interface InvitesListResponse {
  success: boolean;
  message: string;
  data?: Invite[];
}

export interface AcceptInviteResponse {
  success: boolean;
  message: string;
  data?: {
    profile_id: string;
    full_name: string;
    role: InviteRole;
    organization_id: string;
  };
}
