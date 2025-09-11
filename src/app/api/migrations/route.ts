import { NextResponse } from 'next/server'
import { runMigrations } from './run-migrations'

export async function GET() {
  try {
    const result = await runMigrations()
    
    if (result.success) {
      return NextResponse.json({ success: true, message: 'Migrations completed successfully', result })
    } else {
      return NextResponse.json({ success: false, message: 'Migrations failed', error: result.error }, { status: 500 })
    }
  } catch (error) {
    console.error('Error running migrations:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Error running migrations', 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}