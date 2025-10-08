export interface CreateTeamPayload {
  name: string;
  description?: string;
}

export interface Team {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description?: string;
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

export interface TeamResponse {
  success: boolean;
  message: string;
  data?: Team;
}

export interface TeamsListResponse {
  success: boolean;
  message: string;
  data?: Team[];
}
