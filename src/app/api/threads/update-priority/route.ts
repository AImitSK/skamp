// src/app/api/threads/update-priority/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { threadMatcherService } from '@/lib/email/thread-matcher-service';

export async function POST(request: NextRequest) {
  try {
    const { threadId, priority } = await request.json();

    // Validate input
    if (!threadId || !priority) {
      return NextResponse.json(
        { error: 'Missing threadId or priority' },
        { status: 400 }
      );
    }

    // Update thread priority
    await threadMatcherService.updateThreadPriority(threadId, priority);

    return NextResponse.json({
      success: true,
      threadId,
      priority
    });

  } catch (error) {
    console.error('❌ Failed to update thread priority:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update thread priority' },
      { status: 500 }
    );
  }
}
