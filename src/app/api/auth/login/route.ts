import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { LoginPayload, AuthResponse, AuthCookie } from '@/types/auth';

export async function POST(request: NextRequest) {
  try {
    const body: LoginPayload = await request.json();
    const { email, password } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json<AuthResponse>(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Sign in with Supabase Auth
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log('authData:', authData);
    console.log('signInError:', signInError);

    if (signInError || !authData.user || !authData.session) {
      return NextResponse.json<AuthResponse>(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const profile_id = authData.user.id;
    const access_token = authData.session.access_token;
    const refresh_token = authData.session.refresh_token;

    // Get user profile info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', profile_id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json<AuthResponse>(
        { success: false, message: 'Profile not found' },
        { status: 404 }
      );
    }

    // Get user's organization membership and role
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role, organization_id')
      .eq('user_id', profile_id)
      .single();

    // If no membership found, user is an owner who hasn't created org yet
    const role = membership?.role || 'owner';
    const organization_id = membership?.organization_id;

    // Create auth cookie data
    const authCookie: AuthCookie = {
      profile_id,
      access_token,
      refresh_token,
      full_name: profile.full_name,
      role,
      organization_id,
    };

    // Create response
    const response = NextResponse.json<AuthResponse>(
      {
        success: true,
        message: 'Login successful',
        data: {
          profile_id,
          full_name: profile.full_name,
          role,
          organization_id,
        },
      },
      { status: 200 }
    );

    // Set HTTP-only cookie
    response.cookies.set('auth-cookie', JSON.stringify(authCookie), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json<AuthResponse>(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
