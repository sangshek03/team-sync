import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateSlug } from '@/lib/utils';
import { CreateTeamPayload, TeamResponse, TeamsListResponse } from '@/types/team';
import { AuthCookie } from '@/types/auth';

export async function GET(request: NextRequest) {
  try {
    // Get auth cookie
    const authCookieValue = request.cookies.get('auth-cookie')?.value;

    if (!authCookieValue) {
      return NextResponse.json<TeamsListResponse>(
        { success: false, message: 'Unauthorized. Please login first' },
        { status: 401 }
      );
    }

    const authCookie: AuthCookie = JSON.parse(authCookieValue);
    const { organization_id } = authCookie;
    console.log('organization_id from cookie:', organization_id);

    if (!organization_id) {
      console.log('organization_id from cookie:2', organization_id);
      return NextResponse.json<TeamsListResponse>(
        { success: false, message: 'No organization found. Please join or create an organization first' },
        { status: 400 }
      );
    }

    // Get all teams for the organization
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, organization_id, name, slug, description, created_by, created_at, updated_at')
      .eq('organization_id', organization_id);

    if (teamsError) {
      console.error('Teams fetch error:', teamsError);
      return NextResponse.json<TeamsListResponse>(
        { success: false, message: 'Failed to fetch teams' },
        { status: 500 }
      );
    }

    return NextResponse.json<TeamsListResponse>(
      {
        success: true,
        message: 'Teams fetched successfully',
        data: teams || [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get teams error:', error);
    return NextResponse.json<TeamsListResponse>(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get auth cookie
    const authCookieValue = request.cookies.get('auth-cookie')?.value;

    if (!authCookieValue) {
      return NextResponse.json<TeamResponse>(
        { success: false, message: 'Unauthorized. Please login first' },
        { status: 401 }
      );
    }

    const authCookie: AuthCookie = JSON.parse(authCookieValue);
    const { profile_id, role, organization_id } = authCookie;

    // Check if user has permission to create teams
    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json<TeamResponse>(
        { success: false, message: 'Only owners and admins can create teams' },
        { status: 403 }
      );
    }

    if (!organization_id) {
      return NextResponse.json<TeamResponse>(
        { success: false, message: 'No organization found. Please join or create an organization first' },
        { status: 400 }
      );
    }

    // Parse request body
    const body: CreateTeamPayload = await request.json();
    const { name, description } = body;

    // Validation
    if (!name || name.trim() === '') {
      return NextResponse.json<TeamResponse>(
        { success: false, message: 'Team name is required' },
        { status: 400 }
      );
    }

    // Generate slug from name
    const slug = generateSlug(name);

    // Check if team with the same name already exists in this organization
    const { data: existingTeam } = await supabase
      .from('teams')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('name', name)
      .single();

    if (existingTeam) {
      return NextResponse.json<TeamResponse>(
        { success: false, message: 'Team with this name already exists in the organization' },
        { status: 409 }
      );
    }

    // Create team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        organization_id,
        name,
        slug,
        description: description || null,
        created_by: profile_id,
      })
      .select()
      .single();

    if (teamError || !team) {
      console.error('Team creation error:', teamError);
      return NextResponse.json<TeamResponse>(
        { success: false, message: 'Failed to create team' },
        { status: 500 }
      );
    }

    return NextResponse.json<TeamResponse>(
      {
        success: true,
        message: 'Team created successfully',
        data: team,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create team error:', error);
    return NextResponse.json<TeamResponse>(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
