import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { generateSlug } from '@/lib/utils';
import { CreateOrganizationPayload, OrganizationResponse, OrganizationsListResponse } from '@/types/organization';
import { AuthCookie } from '@/types/auth';

export async function GET(request: NextRequest) {
  try {
    // Get auth cookie
    const authCookieValue = request.cookies.get('auth-cookie')?.value;

    if (!authCookieValue) {
      return NextResponse.json<OrganizationsListResponse>(
        { success: false, message: 'Unauthorized. Please login first' },
        { status: 401 }
      );
    }

    const authCookie: AuthCookie = JSON.parse(authCookieValue);
    const { profile_id } = authCookie;

    // Get all organizations where the user is a member
    const { data: memberships, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', profile_id);

    if (membershipError) {
      console.error('Membership fetch error:', membershipError);
      return NextResponse.json<OrganizationsListResponse>(
        { success: false, message: 'Failed to fetch organizations' },
        { status: 500 }
      );
    }

    if (!memberships || memberships.length === 0) {
      return NextResponse.json<OrganizationsListResponse>(
        { success: true, message: 'No organizations found', data: [] },
        { status: 200 }
      );
    }

    // Get organization details
    const organizationIds = memberships.map((m) => m.organization_id);
    const { data: organizations, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, slug, owner_id, created_at, updated_at')
      .in('id', organizationIds);

    if (orgsError) {
      console.error('Organizations fetch error:', orgsError);
      return NextResponse.json<OrganizationsListResponse>(
        { success: false, message: 'Failed to fetch organizations' },
        { status: 500 }
      );
    }

    return NextResponse.json<OrganizationsListResponse>(
      {
        success: true,
        message: 'Organizations fetched successfully',
        data: organizations || [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get organizations error:', error);
    return NextResponse.json<OrganizationsListResponse>(
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
      return NextResponse.json<OrganizationResponse>(
        { success: false, message: 'Unauthorized. Please login first' },
        { status: 401 }
      );
    }
    const authCookie: AuthCookie = JSON.parse(authCookieValue);
    const { profile_id, role } = authCookie;

    // Check if user is owner
    if (role !== 'owner') {
      return NextResponse.json<OrganizationResponse>(
        { success: false, message: 'Only owners can create organizations' },
        { status: 403 }
      );
    }

    // Parse request body
    const body: CreateOrganizationPayload = await request.json();
    const { name } = body;
    if (!name || name.trim() === '') {
      return NextResponse.json<OrganizationResponse>(
        { success: false, message: 'Organization name is required' },
        { status: 400 }
      );
    }

    const slug = generateSlug(name);

    // Check if slug already exists
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingOrg) {
      return NextResponse.json<OrganizationResponse>(
        { success: false, message: 'Organization with this name already exists' },
        { status: 409 }
      );
    }

    // Always use service role client for organization creation
    // because RLS policies require auth.uid() which is not available with cookie auth
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create organization
    const { data: organization, error: orgError } = await client
      .from('organizations')
      .insert({
        name,
        slug,
        owner_id: profile_id,
      })
      .select()
      .single();

    if (orgError || !organization) {
      console.error('Organization creation error:', orgError);
      return NextResponse.json<OrganizationResponse>(
        { success: false, message: 'Failed to create organization' },
        { status: 500 }
      );
    }

    // Add owner to organization_members
    const { error: memberError } = await client
      .from('organization_members')
      .insert({
        organization_id: organization.id,
        user_id: profile_id,
        role: 'owner',
      });

    if (memberError) {
      console.error('Organization member creation error:', memberError);
      // Rollback: delete the organization if member insert fails
      await client.from('organizations').delete().eq('id', organization.id);
      return NextResponse.json<OrganizationResponse>(
        { success: false, message: 'Failed to add owner to organization' },
        { status: 500 }
      );
    }

    return NextResponse.json<OrganizationResponse>(
      {
        success: true,
        message: 'Organization created successfully',
        data: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          owner_id: organization.owner_id,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create organization error:', error);
    return NextResponse.json<OrganizationResponse>(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
