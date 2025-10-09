import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AuthCookie } from '@/types/auth';

interface ActivityLogsResponse {
  success: boolean;
  message: string;
  data?: unknown[];
}

export async function GET(request: NextRequest) {
  try {
    const authCookieValue = request.cookies.get('auth-cookie')?.value;

    if (!authCookieValue) {
      return NextResponse.json<ActivityLogsResponse>(
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
      return NextResponse.json<ActivityLogsResponse>(
        { success: false, message: 'No organization found' },
        { status: 400 }
      );
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: logs, error } = await serviceClient
      .from('activity_log')
      .select('*')
      .eq('organization_id', organization_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Activity logs fetch error:', error);
      return NextResponse.json<ActivityLogsResponse>(
        { success: false, message: 'Failed to fetch activity logs' },
        { status: 500 }
      );
    }

    return NextResponse.json<ActivityLogsResponse>(
      {
        success: true,
        message: 'Activity logs fetched successfully',
        data: logs || [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get activity logs error:', error);
    return NextResponse.json<ActivityLogsResponse>(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
