import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AuthCookie } from '@/types/auth';

interface TeamMembersResponse {
  success: boolean;
  message: string;
  data?: unknown[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params as per Next.js 15 requirement
    const { id: teamId } = await params;

    const authCookieValue = request.cookies.get('auth-cookie')?.value;

    if (!authCookieValue) {
      return NextResponse.json<TeamMembersResponse>(
        { success: false, message: 'Unauthorized. Please login first' },
        { status: 401 }
      );
    }

    const authCookie: AuthCookie = JSON.parse(authCookieValue);
    const { organization_id } = authCookie;

    if (!organization_id) {
      return NextResponse.json<TeamMembersResponse>(
        { success: false, message: 'No organization found' },
        { status: 400 }
      );
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify team belongs to user's organization
    const { data: team, error: teamError } = await serviceClient
      .from('teams')
      .select('id, organization_id')
      .eq('id', teamId)
      .eq('organization_id', organization_id)
      .single();

    if (teamError || !team) {
      return NextResponse.json<TeamMembersResponse>(
        { success: false, message: 'Team not found' },
        { status: 404 }
      );
    }

    // Get team members with profile details
    const { data: members, error } = await serviceClient
      .from('team_members')
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
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Team members fetch error:', error);
      return NextResponse.json<TeamMembersResponse>(
        { success: false, message: 'Failed to fetch team members' },
        { status: 500 }
      );
    }

    return NextResponse.json<TeamMembersResponse>(
      {
        success: true,
        message: 'Team members fetched successfully',
        data: members || [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get team members error:', error);
    return NextResponse.json<TeamMembersResponse>(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
