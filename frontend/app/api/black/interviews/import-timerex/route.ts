import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';

// TimeRex API configuration
const TIMEREX_BASE_URL = process.env.TIMEREX_BASE_URL || 'https://api.timerex.net/v1';
const TIMEREX_API_KEY = process.env.TIMEREX_API_KEY || '';
const TIMEREX_CALENDAR_IDS = process.env.TIMEREX_CALENDAR_IDS || '';
const MAX_RETRIES = 3;
const RETRY_DELAY = 500;

// 認証チェック
async function checkAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7);
  return verifyAccessToken(token);
}

// Sleep utility
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// TimeRex API request with retry
async function timerexRequest(endpoint: string, params?: Record<string, string>): Promise<unknown> {
  const url = new URL(`${TIMEREX_BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url.toString(), {
        headers: {
          'X-Api-Key': TIMEREX_API_KEY,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`TimeRex API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.warn(`TimeRex request attempt ${attempt + 1}/${MAX_RETRIES} failed:`, error);
      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY * (attempt + 1));
      } else {
        throw error;
      }
    }
  }
}

// TimeRex API request with full URL (for pagination)
async function timerexRequestUrl(fullUrl: string): Promise<unknown> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(fullUrl, {
        headers: {
          'X-Api-Key': TIMEREX_API_KEY,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`TimeRex API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.warn(`TimeRex request attempt ${attempt + 1}/${MAX_RETRIES} failed:`, error);
      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY * (attempt + 1));
      } else {
        throw error;
      }
    }
  }
}

// Get nested value from object
function getNestedValue(obj: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (key.includes('.')) {
      const parts = key.split('.');
      let val: unknown = obj;
      for (const part of parts) {
        if (val && typeof val === 'object' && part in val) {
          val = (val as Record<string, unknown>)[part];
        } else {
          val = undefined;
          break;
        }
      }
      if (val !== undefined) return val;
    } else if (key in obj) {
      return obj[key];
    }
  }
  return undefined;
}

// Normalize TimeRex appointment data
function normalizeAppointment(raw: Record<string, unknown>) {
  const rawStatus = String(getNestedValue(raw, 'status') || '').toLowerCase();
  let status: string;
  if (rawStatus === 'canceled' || rawStatus === 'cancelled') {
    status = 'cancelled';
  } else if (rawStatus === 'completed' || rawStatus === 'done') {
    status = 'completed';
  } else if (rawStatus === 'no_show') {
    status = 'no_show';
  } else {
    status = 'scheduled';
  }

  return {
    externalId: String(raw.id || ''),
    title: getNestedValue(raw, 'title') as string | null,
    startAt: getNestedValue(raw, 'start_at', 'start') as string | null,
    endAt: getNestedValue(raw, 'end_at', 'end') as string | null,
    guestName: getNestedValue(raw, 'guest.name', 'guest_name') as string | null,
    guestEmail: getNestedValue(raw, 'guest.email', 'guest_email') as string | null,
    guestPhone: getNestedValue(raw, 'guest.phone', 'guest_phone') as string | null,
    status,
    hostName: getNestedValue(raw, 'host.name', 'host_name') as string | null,
    hostEmail: getNestedValue(raw, 'host.email', 'host_email') as string | null,
    meetingUrl: getNestedValue(raw, 'meeting_url') as string | null,
    calendarId: getNestedValue(raw, 'calendar_id', 'calendar.id') as string | null,
    rawPayload: raw,
  };
}

// Calculate duration in minutes from start and end times
function calculateDuration(startAt: string | null, endAt: string | null): number {
  if (!startAt || !endAt) return 60; // default
  try {
    const start = new Date(startAt);
    const end = new Date(endAt);
    const diffMs = end.getTime() - start.getTime();
    return Math.round(diffMs / 60000) || 60;
  } catch {
    return 60;
  }
}

// POST /api/black/interviews/import-timerex - TimeRexからインポート
export async function POST(request: NextRequest) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    if (!TIMEREX_API_KEY) {
      return NextResponse.json(
        { detail: 'TimeRex API key is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const since = body.since || null;
    const until = body.until || null;
    const interviewTypeId = body.interviewTypeId; // Required: which interview type to use

    if (!interviewTypeId) {
      return NextResponse.json(
        { detail: 'interviewTypeId is required' },
        { status: 400 }
      );
    }

    // Verify interview type exists
    const interviewType = await prisma.interviewType.findUnique({
      where: { id: BigInt(interviewTypeId) },
    });
    if (!interviewType) {
      return NextResponse.json(
        { detail: 'Interview type not found' },
        { status: 400 }
      );
    }

    // Build date range (default: 30 days ago to 30 days from now)
    const now = new Date();
    const sinceDate = since
      ? new Date(since)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const untilDate = until
      ? new Date(until)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const params: Record<string, string> = {
      since: sinceDate.toISOString(),
      until: untilDate.toISOString(),
    };

    if (TIMEREX_CALENDAR_IDS) {
      params.calendar_ids = TIMEREX_CALENDAR_IDS;
    }

    // Stats
    const stats = {
      fetched: 0,
      created: 0,
      updated: 0,
      unchanged: 0,
      errors: 0,
    };

    // Fetch all appointments with pagination
    let data = (await timerexRequest('/appointments', params)) as {
      data?: Record<string, unknown>[];
      meta?: { next?: string };
    };

    const allAppointments: Record<string, unknown>[] = [];
    while (true) {
      const appointments = data?.data || [];
      allAppointments.push(...appointments);

      const nextUrl = data?.meta?.next;
      if (!nextUrl) break;

      data = (await timerexRequestUrl(nextUrl)) as {
        data?: Record<string, unknown>[];
        meta?: { next?: string };
      };
    }

    stats.fetched = allAppointments.length;

    // Process each appointment
    for (const rawAppointment of allAppointments) {
      try {
        const appointment = normalizeAppointment(rawAppointment);

        if (!appointment.externalId) {
          console.warn('Skipping appointment without ID');
          continue;
        }

        // Check if already exists
        const existing = await prisma.interview.findUnique({
          where: { timerexBookingId: appointment.externalId },
        });

        const duration = calculateDuration(appointment.startAt, appointment.endAt);

        if (existing) {
          // Check if data changed
          const hasChanges =
            existing.guestName !== (appointment.guestName || 'Unknown') ||
            existing.guestEmail !== appointment.guestEmail ||
            existing.currentStatus !== appointment.status ||
            existing.meetingUrl !== appointment.meetingUrl ||
            (appointment.startAt &&
              existing.scheduledAt.toISOString() !== new Date(appointment.startAt).toISOString());

          if (hasChanges) {
            await prisma.interview.update({
              where: { id: existing.id },
              data: {
                guestName: appointment.guestName || 'Unknown',
                guestEmail: appointment.guestEmail,
                guestPhone: appointment.guestPhone,
                scheduledAt: appointment.startAt ? new Date(appointment.startAt) : existing.scheduledAt,
                durationMinutes: duration,
                meetingUrl: appointment.meetingUrl,
                currentStatus: appointment.status,
                timerexData: appointment.rawPayload as object,
                importedAt: new Date(),
              },
            });
            stats.updated++;
          } else {
            stats.unchanged++;
          }
        } else {
          // Create new interview
          await prisma.interview.create({
            data: {
              timerexBookingId: appointment.externalId,
              interviewTypeId: BigInt(interviewTypeId),
              adminUserId: BigInt(payload.sub),
              guestName: appointment.guestName || 'Unknown',
              guestEmail: appointment.guestEmail,
              guestPhone: appointment.guestPhone,
              scheduledAt: appointment.startAt ? new Date(appointment.startAt) : new Date(),
              durationMinutes: duration,
              meetingUrl: appointment.meetingUrl,
              currentStatus: appointment.status,
              timerexData: appointment.rawPayload as object,
              importedAt: new Date(),
            },
          });
          stats.created++;
        }
      } catch (error) {
        console.error('Error processing appointment:', error);
        stats.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${stats.created} new, updated ${stats.updated}, unchanged ${stats.unchanged}`,
      stats,
    });
  } catch (error) {
    console.error('Import TimeRex error:', error);
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
