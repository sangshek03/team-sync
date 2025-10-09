import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { generateRandomPassword, generateInviteToken } from '@/lib/utils'
import { emailService } from '@/lib/email'
import {
    CreateInvitePayload,
    InviteResponse,
    InvitesListResponse,
} from '@/types/invite'
import { AuthCookie } from '@/types/auth'

export async function GET(request: NextRequest) {
    try {
        // Get auth cookie
        const authCookieValue = request.cookies.get('auth-cookie')?.value

        if (!authCookieValue) {
            return NextResponse.json<InvitesListResponse>(
                { success: false, message: 'Unauthorized. Please login first' },
                { status: 401 }
            )
        }

        const authCookie: AuthCookie = JSON.parse(authCookieValue)
        const { organization_id, role } = authCookie

        if (!organization_id) {
            return NextResponse.json<InvitesListResponse>(
                { success: false, message: 'No organization found' },
                { status: 400 }
            )
        }

        // Only owner and admin can view invites
        if (role !== 'owner' && role !== 'admin') {
            return NextResponse.json<InvitesListResponse>(
                {
                    success: false,
                    message: 'Only owners and admins can view invites',
                },
                { status: 403 }
            )
        }

        // Get all pending invites for the organization
        const { data: invites, error: invitesError } = await supabase
            .from('organization_invites')
            .select('*')
            .eq('organization_id', organization_id)
            .eq('status', 'pending')

        if (invitesError) {
            console.error('Invites fetch error:', invitesError)
            return NextResponse.json<InvitesListResponse>(
                { success: false, message: 'Failed to fetch invites' },
                { status: 500 }
            )
        }

        return NextResponse.json<InvitesListResponse>(
            {
                success: true,
                message: 'Invites fetched successfully',
                data: invites || [],
            },
            { status: 200 }
        )
    } catch (error) {
        console.error('Get invites error:', error)
        return NextResponse.json<InvitesListResponse>(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        // Get auth cookie
        const authCookieValue = request.cookies.get('auth-cookie')?.value

        if (!authCookieValue) {
            return NextResponse.json<InviteResponse>(
                { success: false, message: 'Unauthorized. Please login first' },
                { status: 401 }
            )
        }

        const authCookie: AuthCookie = JSON.parse(authCookieValue)
        const { profile_id, role } = authCookie

        // Parse request body
        const body: CreateInvitePayload = await request.json()
        const { email, name, role: inviteRole, team_id, organization_id } = body

        if (!organization_id) {
            return NextResponse.json<InviteResponse>(
                { success: false, message: 'No organization found' },
                { status: 400 }
            )
        }

        // Validation
        if (!email || !name || !inviteRole) {
            return NextResponse.json<InviteResponse>(
                {
                    success: false,
                    message: 'Email, name, and role are required',
                },
                { status: 400 }
            )
        }

        // Validate invite role
        if (!['admin', 'member'].includes(inviteRole)) {
            return NextResponse.json<InviteResponse>(
                {
                    success: false,
                    message: 'Invalid role. Must be admin or member',
                },
                { status: 400 }
            )
        }

        // Permission checks
        // Owner can invite admin or member
        // Admin can only invite member
        if (role === 'admin') {
            if (inviteRole === 'admin') {
                return NextResponse.json<InviteResponse>(
                    {
                        success: false,
                        message: 'Admins cannot invite other admins, can only invite members',
                    },
                    { status: 403 }
                )
            }
        } else if(role === 'member') {
            return NextResponse.json<InviteResponse>(
                {
                    success: false,
                    message: 'Only owners and admins can send invites',
                },
                { status: 403 }
            )
        }

        // If team_id provided, validate it exists in the organization
        if (team_id) {
            const { data: team, error: teamError } = await supabase
                .from('teams')
                .select('id')
                .eq('id', team_id)
                .eq('organization_id', organization_id)
                .single()

            if (teamError || !team) {
                return NextResponse.json<InviteResponse>(
                    {
                        success: false,
                        message: 'Team not found in organization',
                    },
                    { status: 404 }
                )
            }
        }

        // Check if user already exists with this email
        const { data: existingUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', email)
            .single()

        if (existingUser) {
            return NextResponse.json<InviteResponse>(
                {
                    success: false,
                    message: 'User with this email already exists',
                },
                { status: 409 }
            )
        }

        // Check if there's already a pending invite for this email
        const { data: existingInvite } = await supabase
            .from('organization_invites')
            .select('id')
            .eq('email', email)
            .eq('organization_id', organization_id)
            .eq('status', 'pending')
            .single()

        if (existingInvite) {
            return NextResponse.json<InviteResponse>(
                {
                    success: false,
                    message: 'Pending invite already exists for this email',
                },
                { status: 409 }
            )
        }

        // Generate random password and token
        const password = generateRandomPassword()
        const token = generateInviteToken()
        const expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + 24) // 24 hours expiry

        // Use service role client to bypass RLS for first-time invite creation
        const serviceClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Create user account with Supabase Auth
        const { data: authData, error: signUpError } =
            await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                        avatar_url: null,
                    },
                },
            })

        if (signUpError || !authData.user) {
            console.error('User creation error:', signUpError)
            return NextResponse.json<InviteResponse>(
                {
                    success: false,
                    message: `Failed to create user: ${signUpError?.message}`,
                },
                { status: 500 }
            )
        }

        const new_user_id = authData.user.id

        // Profile is automatically created by database trigger
        // Add user to organization_members
        const { error: memberError } = await serviceClient
            .from('organization_members')
            .insert({
                organization_id,
                user_id: new_user_id,
                role: inviteRole,
            })

        if (memberError) {
            console.error('Organization member creation error:', memberError)
            // Rollback: delete auth user (profile will be cascade deleted)
            await serviceClient.auth.admin.deleteUser(new_user_id)
            return NextResponse.json<InviteResponse>(
                {
                    success: false,
                    message: 'Failed to add user to organization',
                },
                { status: 500 }
            )
        }

        // If team_id provided, add user to team_members
        if (team_id) {
            const { error: teamMemberError } = await serviceClient
                .from('team_members')
                .insert({
                    team_id,
                    user_id: new_user_id,
                    role: 'member',
                    added_by: profile_id,
                })

            if (teamMemberError) {
                console.error('Team member creation error:', teamMemberError)
                // Rollback: delete organization member and auth user (profile will be cascade deleted)
                await serviceClient
                    .from('organization_members')
                    .delete()
                    .eq('user_id', new_user_id)
                await serviceClient.auth.admin.deleteUser(new_user_id)
                return NextResponse.json<InviteResponse>(
                    { success: false, message: 'Failed to add user to team' },
                    { status: 500 }
                )
            }
        }

        // Create invitation record
        const { data: invite, error: inviteError } = await serviceClient
            .from('organization_invites')
            .insert({
                organization_id,
                inviter_id: profile_id,
                email,
                role: inviteRole,
                token,
                status: 'pending',
                expires_at: expiresAt.toISOString(),
            })
            .select()
            .single()

        if (inviteError || !invite) {
            console.error('Invite creation error:', inviteError)
            // Rollback all
            if (team_id) {
                await serviceClient
                    .from('team_members')
                    .delete()
                    .eq('user_id', new_user_id)
            }
            await serviceClient
                .from('organization_members')
                .delete()
                .eq('user_id', new_user_id)
            await serviceClient.auth.admin.deleteUser(new_user_id)
            return NextResponse.json<InviteResponse>(
                { success: false, message: 'Failed to create invitation' },
                { status: 500 }
            )
        }

        // Send invitation email
        try {
            await emailService.sendInviteEmail(
                email,
                name,
                password,
                inviteRole,
                token
            )

            // Log activity after successful email send
            await serviceClient.from('activity_log').insert({
                organization_id,
                actor_id: profile_id,
                action: `Invited ${name} as ${inviteRole}`,
                action_type: 'user.invited',
                metadata: { name, role: inviteRole },
            })

            return NextResponse.json<InviteResponse>(
                {
                    success: true,
                    message: 'Invitation sent successfully',
                    data: invite,
                },
                { status: 201 }
            )
        } catch (emailError) {
            console.error('Email sending error:', emailError)
            // Don't rollback - invitation is created, just log the error
            return NextResponse.json<InviteResponse>(
                {
                    success: true,
                    message: 'Invitation created but email failed to send',
                    data: invite,
                },
                { status: 201 }
            )
        }
    } catch (error) {
        console.error('Create invite error:', error)
        return NextResponse.json<InviteResponse>(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}
