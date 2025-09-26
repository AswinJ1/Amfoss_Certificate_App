import { NextResponse } from 'next/server'
import { verifyAndGenerateCertificate } from '@/lib/actions'

export async function POST(request: Request) {
  try {
    const values = await request.json()
    
    const result = await verifyAndGenerateCertificate(values)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to process request' 
      },
      { status: 500 }
    )
  }
}