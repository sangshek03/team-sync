import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { AcceptInviteResponse } from '@/types/invite';
import { AuthCookie } from '@/types/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const email = searchParams.get('email');
    const password = searchParams.get('password');

    // Validation
    if (!token || !email || !password) {
      return NextResponse.json<AcceptInviteResponse>(
        { success: false, message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Find the invitation
    const { data: invite, error: inviteError } = await supabase
      .from('organization_invites')
      .select('*')
      .eq('token', token)
      .eq('email', email)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json<AcceptInviteResponse>(
        { success: false, message: 'Invalid or expired invitation' },
        { status: 404 }
      );
    }

    // Check if invite is pending
    if (invite.status !== 'pending') {
      return NextResponse.json<AcceptInviteResponse>(
        { success: false, message: `Invitation is ${invite.status}` },
        { status: 400 }
      );
    }

    // Check if invite has expired
    const now = new Date();
    const expiresAt = new Date(invite.expires_at);
    if (now > expiresAt) {
      // Update invite status to expired
      await supabase
        .from('organization_invites')
        .update({ status: 'expired' })
        .eq('id', invite.id);

      return NextResponse.json<AcceptInviteResponse>(
        { success: false, message: 'Invitation has expired' },
        { status: 400 }
      );
    }

    // Sign in with the provided credentials
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !authData.user || !authData.session) {
      return NextResponse.json<AcceptInviteResponse>(
        { success: false, message: 'Failed to authenticate. Invalid credentials' },
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
      return NextResponse.json<AcceptInviteResponse>(
        { success: false, message: 'Profile not found' },
        { status: 404 }
      );
    }

    // Get user's organization membership
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role, organization_id')
      .eq('user_id', profile_id)
      .eq('organization_id', invite.organization_id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json<AcceptInviteResponse>(
        { success: false, message: 'Organization membership not found' },
        { status: 404 }
      );
    }

    // Update invite status to accepted
    await supabase
      .from('organization_invites')
      .update({ status: 'accepted' })
      .eq('id', invite.id);

    // Create auth cookie data
    const authCookie: AuthCookie = {
      profile_id,
      access_token,
      refresh_token,
      full_name: profile.full_name,
      role: membership.role,
      organization_id: membership.organization_id,
    };

    // Create response and redirect to dashboard or homepage
    const response = NextResponse.redirect(
      new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
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
    console.error('Accept invite error:', error);
    return NextResponse.json<AcceptInviteResponse>(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
