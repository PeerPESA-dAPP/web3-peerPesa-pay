import { NextResponse } from 'next/server'

export async function GET() {
  // Return a basic response for thirdweb auth check
  // This prevents 404 errors when thirdweb tries to check auth status
  return NextResponse.json({ 
    address: null,
    authenticated: false 
  })
}

export async function POST() {
  // Handle auth requests
  return NextResponse.json({ 
    success: false,
    message: "Authentication not implemented" 
  })
}


