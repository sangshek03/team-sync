import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { AuthCookie } from '@/types/auth'

interface UpdateRolePayload {
    role: 'owner' | 'admin' | 'member'
}

interface UpdateRoleResponse {
    success: boolean
    message: string
    data?: Record<string, unknown>
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Await params as per Next.js 15 requirement
        const { id: memberId } = await params;

        // Get auth cookie
        const authCookieValue = request.cookies.get('auth-cookie')?.value

        if (!authCookieValue) {
            return NextResponse.json<UpdateRoleResponse>(
                { success: false, message: 'Unauthorized. Please login first' },
                { status: 401 }
            )
        }

        const authCookie: AuthCookie = JSON.parse(authCookieValue)
        const { profile_id, organization_id, role: actorRole } = authCookie

        if (!organization_id) {
            return NextResponse.json<UpdateRoleResponse>(
                { success: false, message: 'No organization found' },
                { status: 400 }
            )
        }

        // Only owner and admin can change roles
        if (actorRole !== 'owner' && actorRole !== 'admin') {
            return NextResponse.json<UpdateRoleResponse>(
                {
                    success: false,
                    message: 'Only owners and admins can change roles',
                },
                { status: 403 }
            )
        }

        // Parse request body
        const body: UpdateRolePayload = await request.json()
        const { role: newRole } = body

        // Validate new role
        if (!['owner', 'admin', 'member'].includes(newRole)) {
            return NextResponse.json<UpdateRoleResponse>(
                {
                    success: false,
                    message: 'Invalid role. Must be owner, admin, or member',
                },
                { status: 400 }
            )
        }

        // Use service role client
        const serviceClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Get the member to be updated
        const { data: member, error: memberFetchError } = await serviceClient
            .from('organization_members')
            .select('*, profiles!organization_members_user_id_fkey(full_name)')
            .eq('id', memberId)
            .eq('organization_id', organization_id)
            .single()

        if (memberFetchError || !member) {
            return NextResponse.json<UpdateRoleResponse>(
                { success: false, message: 'Member not found' },
                { status: 404 }
            )
        }

        const oldRole = member.role
        const memberName = member.profiles?.full_name || 'Unknown'

        // Permission check: Admin can only change member to admin
        if (actorRole === 'admin') {
            if (oldRole !== 'member') {
                return NextResponse.json<UpdateRoleResponse>(
                    {
                        success: false,
                        message: 'Admins can only promote members to admin',
                    },
                    { status: 403 }
                )
            }
            if (newRole !== 'admin' && newRole !== 'member') {
                return NextResponse.json<UpdateRoleResponse>(
                    {
                        success: false,
                        message: 'Admins can only set role to admin or member',
                    },
                    { status: 403 }
                )
            }
        }

        // Prevent changing own role
        if (member.user_id === profile_id) {
            return NextResponse.json<UpdateRoleResponse>(
                {
                    success: false,
                    message: 'You cannot change your own role',
                },
                { status: 403 }
            )
        }

        // Update the role
        const { error: updateError } = await serviceClient
            .from('organization_members')
            .update({ role: newRole })
            .eq('id', memberId)
            .eq('organization_id', organization_id)

        if (updateError) {
            console.error('Role update error:', updateError)
            return NextResponse.json<UpdateRoleResponse>(
                { success: false, message: 'Failed to update role' },
                { status: 500 }
            )
        }

        // Log activity after successful update
        await serviceClient.from('activity_log').insert({
            organization_id,
            actor_id: profile_id,
            action: `Changed ${memberName} role from ${oldRole} to ${newRole}`,
            action_type: 'role.changed',
            metadata: { name: memberName, role: newRole },
        })

        return NextResponse.json<UpdateRoleResponse>(
            {
                success: true,
                message: 'Role updated successfully',
            },
            { status: 200 }
        )
    } catch (error) {
        console.error('Update role error:', error)
        return NextResponse.json<UpdateRoleResponse>(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}
