import { NextRequest, NextResponse } from 'next/server';
import { AuthCookie } from '@/types/auth';

export async function GET(request: NextRequest) {
  try {
    const authCookieValue = request.cookies.get('auth-cookie')?.value;

    if (!authCookieValue) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const authCookie: AuthCookie = JSON.parse(authCookieValue);

    return NextResponse.json(
      {
        success: true,
        message: 'User data retrieved',
        data: {
          profile_id: authCookie.profile_id,
          full_name: authCookie.full_name,
          role: authCookie.role,
          organization_id: authCookie.organization_id,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
