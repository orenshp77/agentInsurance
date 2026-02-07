import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Get errors from last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const errors = await prisma.log.findMany({
      where: {
        errorLevel: {
          in: ['ERROR', 'CRITICAL']
        },
        createdAt: {
          gte: yesterday
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });

    return NextResponse.json({
      errors: errors.map(err => ({
        id: err.id,
        message: err.message,
        errorLevel: err.errorLevel,
        createdAt: err.createdAt,
        aiFix: err.aiFix
      })),
      count: errors.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching logs:', error);

    return NextResponse.json({
      errors: [],
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
