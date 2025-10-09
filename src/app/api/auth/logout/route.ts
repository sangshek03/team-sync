import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  try {
    const response = NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { status: 200 }
    );

    // Clear the auth cookie
    response.cookies.set('auth-cookie', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (_error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
