import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Cron endpoint to keep Supabase database active
 * This prevents the database from being paused due to inactivity on Vercel free tier
 */
export async function GET(request: Request) {
  try {
    /*
     * Verify the request is coming from Vercel Cron
     * This header is automatically set by Vercel for cron requests
     */
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    /*
     * Execute a simple query to keep the database connection active
     * This queries the master brand table which is lightweight
     */
    const { data, error } = await supabase
      .from('tbl_master_brand')
      .select('id')
      .limit(1)
      .single();

    if (error) {
      console.error('Database ping error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Database connection active',
      timestamp: new Date().toISOString(),
      data: data
    });

  } catch (error) {
    console.error('Keep-alive error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
