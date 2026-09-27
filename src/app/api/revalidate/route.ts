import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

const REVALIDATION_SECRET =
  process.env.REVALIDATION_SECRET_TOKEN ||
  process.env.REVALIDATE_SECRET ||
  'bazar-revalidate-secret-token-2025';

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const querySecret = url.searchParams.get('secret') || url.searchParams.get('token');
    const authHeader = request.headers.get('authorization');
    const bearerSecret = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    const providedSecret = querySecret || bearerSecret;

    if (providedSecret !== REVALIDATION_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid revalidation token', revalidated: false },
        { status: 401 }
      );
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional
    }

    const pathsToRevalidate: string[] = [];

    if (body.path && typeof body.path === 'string') {
      revalidatePath(body.path);
      pathsToRevalidate.push(body.path);
    } else if (Array.isArray(body.paths)) {
      for (const p of body.paths) {
        if (typeof p === 'string') {
          revalidatePath(p);
          pathsToRevalidate.push(p);
        }
      }
    } else {
      // Revalidate all primary catalog routes when no specific path is given
      const defaultPaths = ['/', '/categories', '/works', '/shops'];
      for (const p of defaultPaths) {
        revalidatePath(p);
        pathsToRevalidate.push(p);
      }
    }

    // Revalidate root layout to ensure all pages reflect the latest catalog
    revalidatePath('/', 'layout');

    if (body.tag && typeof body.tag === 'string') {
      revalidateTag(body.tag, 'page');
    }

    return NextResponse.json({
      revalidated: true,
      now: Date.now(),
      paths: pathsToRevalidate,
    });
  } catch (error: any) {
    console.error('Error in ISR revalidation route:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to revalidate', revalidated: false },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
