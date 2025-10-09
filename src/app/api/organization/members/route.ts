import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AuthCookie } from '@/types/auth';

interface OrganizationMembersResponse {
  success: boolean;
  message: string;
  data?: any[];
}

export async function GET(request: NextRequest) {
  try {
    const authCookieValue = request.cookies.get('auth-cookie')?.value;

    if (!authCookieValue) {
      return NextResponse.json<OrganizationMembersResponse>(
        { success: false, message: 'Unauthorized. Please login first' },
        { status: 401 }
      );
    }

    const authCookie: AuthCookie = JSON.parse(authCookieValue);
    const { organization_id: authOrgId } = authCookie;

    // Get organization_id from query parameter (priority) or auth cookie (fallback)
    const { searchParams } = new URL(request.url);
    const queryOrgId = searchParams.get('organization_id');
    const organization_id = queryOrgId || authOrgId;

    if (!organization_id) {
      return NextResponse.json<OrganizationMembersResponse>(
        { success: false, message: 'No organization found' },
        { status: 400 }
      );
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all organization members with profile details
    const { data: members, error } = await serviceClient
      .from('organization_members')
      .select(`
        id,
        role,
        created_at,
        user_id,
        profiles:user_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('organization_id', organization_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Organization members fetch error:', error);
      return NextResponse.json<OrganizationMembersResponse>(
        { success: false, message: 'Failed to fetch organization members' },
        { status: 500 }
      );
    }

    return NextResponse.json<OrganizationMembersResponse>(
      {
        success: true,
        message: 'Organization members fetched successfully',
        data: members || [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get organization members error:', error);
    return NextResponse.json<OrganizationMembersResponse>(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
