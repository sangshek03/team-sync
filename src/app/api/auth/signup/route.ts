import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { SignupPayload, AuthResponse } from '@/types/auth';

export async function POST(request: NextRequest) {
  try {
    const body: SignupPayload = await request.json();
    const { email, password, f_name, l_name, role, organization_id } = body;

    // Validation
    if (!email || !password || !f_name || !l_name || !role) {
      return NextResponse.json<AuthResponse>(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['owner', 'admin', 'member'].includes(role)) {
      return NextResponse.json<AuthResponse>(
        { success: false, message: 'Invalid role. Must be owner, admin, or member' },
        { status: 400 }
      );
    }

    console.log('organization_id:', organization_id);

    // Check if organization_id is required based on role
    if (role !== 'owner' && !organization_id) {
      return NextResponse.json<AuthResponse>(
        { success: false, message: 'organization_id is required for admin and member roles' },
        { status: 400 }
      );
    }

    // Validate organization exists if organization_id provided
    if (organization_id) {
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', organization_id)
        .single();

      if (orgError || !org) {
        return NextResponse.json<AuthResponse>(
          { success: false, message: 'Organization not found' },
          { status: 404 }
        );
      }
    }

    const full_name = `${f_name} ${l_name}`;

    // Sign up user with Supabase Auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          avatar_url: null,
        },
      },
    });

    if (signUpError) {
      return NextResponse.json<AuthResponse>(
        { success: false, message: signUpError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json<AuthResponse>(
        { success: false, message: 'Failed to create user' },
        { status: 500 }
      );
    }

    const profile_id = authData.user.id;

    const {data: profile} = await supabase
      .from('profiles')
      .insert({
        id: profile_id,
        full_name
      });

    // If organization_id is provided, add user to organization_members
    if (organization_id) {
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id,
          user_id: profile_id,
          role,
        });

      if (memberError) {
        // Rollback: delete the auth user if organization member insert fails
        await supabase.auth.admin.deleteUser(profile_id);

        return NextResponse.json<AuthResponse>(
          { success: false, message: `Failed to add user to organization: ${memberError.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json<AuthResponse>(
      {
        success: true,
        message: 'User created successfully',
        data: {
          profile_id,
          full_name,
          role,
          organization_id: organization_id || undefined,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json<AuthResponse>(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
