import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { InviteResponse } from '@/types/invite';
import { AuthCookie } from '@/types/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get auth cookie
    const authCookieValue = request.cookies.get('auth-cookie')?.value;

    if (!authCookieValue) {
      return NextResponse.json<InviteResponse>(
        { success: false, message: 'Unauthorized. Please login first' },
        { status: 401 }
      );
    }

    const authCookie: AuthCookie = JSON.parse(authCookieValue);
    const { organization_id, role } = authCookie;

    if (!organization_id) {
      return NextResponse.json<InviteResponse>(
        { success: false, message: 'No organization found' },
        { status: 400 }
      );
    }

    // Only owner and admin can revoke invites
    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json<InviteResponse>(
        { success: false, message: 'Only owners and admins can revoke invites' },
        { status: 403 }
      );
    }

    // Get the invitation
    const { data: invite, error: inviteError } = await supabase
      .from('organization_invites')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organization_id)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json<InviteResponse>(
        { success: false, message: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check if invite is already accepted or revoked
    if (invite.status !== 'pending') {
      return NextResponse.json<InviteResponse>(
        { success: false, message: `Cannot revoke ${invite.status} invitation` },
        { status: 400 }
      );
    }

    // Update invite status to revoked
    const { error: updateError } = await supabase
      .from('organization_invites')
      .update({ status: 'revoked' })
      .eq('id', id);

    if (updateError) {
      console.error('Invite revoke error:', updateError);
      return NextResponse.json<InviteResponse>(
        { success: false, message: 'Failed to revoke invitation' },
        { status: 500 }
      );
    }

    return NextResponse.json<InviteResponse>(
      {
        success: true,
        message: 'Invitation revoked successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Revoke invite error:', error);
    return NextResponse.json<InviteResponse>(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
