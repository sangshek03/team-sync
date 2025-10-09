import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { AuthCookie } from '@/types/auth'

interface CreateTeamPayload {
    name: string
    slug?: string
    description?: string
}

interface TeamResponse {
    success: boolean
    message: string
    data?: unknown
}

export async function GET(request: NextRequest) {
    try {
        const authCookieValue = request.cookies.get('auth-cookie')?.value;

        if (!authCookieValue) {
            return NextResponse.json<TeamResponse>(
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
            return NextResponse.json<TeamResponse>(
                { success: false, message: 'No organization found' },
                { status: 400 }
            );
        }

        const serviceClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: teams, error } = await serviceClient
            .from('teams')
            .select(`
                *,
                creator:created_by (
                    id,
                    full_name
                )
            `)
            .eq('organization_id', organization_id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Teams fetch error:', error);
            return NextResponse.json<TeamResponse>(
                { success: false, message: 'Failed to fetch teams' },
                { status: 500 }
            );
        }

        return NextResponse.json<TeamResponse>(
            {
                success: true,
                message: 'Teams fetched successfully',
                data: teams || [],
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Get teams error:', error);
        return NextResponse.json<TeamResponse>(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        // Get auth cookie
        const authCookieValue = request.cookies.get('auth-cookie')?.value

        if (!authCookieValue) {
            return NextResponse.json<TeamResponse>(
                { success: false, message: 'Unauthorized. Please login first' },
                { status: 401 }
            )
        }

        const authCookie: AuthCookie = JSON.parse(authCookieValue)
        const { profile_id, organization_id, role } = authCookie

        if (!organization_id) {
            return NextResponse.json<TeamResponse>(
                { success: false, message: 'No organization found' },
                { status: 400 }
            )
        }

        // Only owner and admin can create teams
        if (role !== 'owner' && role !== 'admin') {
            return NextResponse.json<TeamResponse>(
                {
                    success: false,
                    message: 'Only owners and admins can create teams',
                },
                { status: 403 }
            )
        }

        // Parse request body
        const body: CreateTeamPayload = await request.json()
        const { name, slug, description } = body

        // Validation
        if (!name || name.trim() === '') {
            return NextResponse.json<TeamResponse>(
                { success: false, message: 'Team name is required' },
                { status: 400 }
            )
        }

        // Use service role client
        const serviceClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Create team
        const { data: team, error: teamError } = await serviceClient
            .from('teams')
            .insert({
                organization_id,
                name,
                slug,
                description,
                created_by: profile_id,
            })
            .select()
            .single()

        if (teamError) {
            console.error('Team creation error:', teamError)

            // Check for duplicate team name
            if (teamError.code === '23505') {
                return NextResponse.json<TeamResponse>(
                    {
                        success: false,
                        message: 'A team with this name already exists in your organization',
                    },
                    { status: 409 }
                )
            }

            return NextResponse.json<TeamResponse>(
                { success: false, message: 'Failed to create team' },
                { status: 500 }
            )
        }

        // Log activity after successful creation
        await serviceClient.from('activity_log').insert({
            organization_id,
            actor_id: profile_id,
            action: `Created team ${name}`,
            action_type: 'team.created',
            metadata: { name, role: null },
        })

        return NextResponse.json<TeamResponse>(
            {
                success: true,
                message: 'Team created successfully',
                data: team,
            },
            { status: 201 }
        )
    } catch (error) {
        console.error('Create team error:', error)
        return NextResponse.json<TeamResponse>(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}
