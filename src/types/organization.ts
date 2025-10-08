export interface CreateOrganizationPayload {
  name: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface OrganizationResponse {
  success: boolean;
  message: string;
  data?: Organization;
}

export interface OrganizationsListResponse {
  success: boolean;
  message: string;
  data?: Organization[];
}
