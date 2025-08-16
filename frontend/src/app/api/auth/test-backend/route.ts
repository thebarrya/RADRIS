import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Determine the correct backend URL based on environment
    const isDocker = process.env.DOCKER_ENV === 'true';
    const backendUrl = isDocker 
      ? 'http://backend:3001/api'
      : process.env.INTERNAL_API_URL || 'http://localhost:3001/api';

    const loginUrl = `${backendUrl}/auth/login`;

    console.log('🔐 API Route - Environment debug:', {
      isDocker,
      backendUrl,
      loginUrl,
      dockerEnv: process.env.DOCKER_ENV,
      internalApiUrl: process.env.INTERNAL_API_URL
    });

    // Make request to backend
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend login failed:', response.status, errorText);
      
      return NextResponse.json(
        { message: `Backend authentication failed: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Backend auth success:', { 
      hasToken: !!data.token, 
      userRole: data.user?.role 
    });

    // Return the authentication data
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ API Route error:', error);
    
    return NextResponse.json(
      { 
        message: 'Internal server error during authentication',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}