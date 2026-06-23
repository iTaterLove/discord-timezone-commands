import { parse, parseDate } from 'chrono-node';
import { resolveTimezone } from './timezone.js';

// ---------------------------------------------------------------------------
// BUG ANALYSIS — why all three reported failures had the same root causes
//
// The original code called: parse(trimmedInput)
// with no reference date or timezone context, then subtracted a static offset.
//
// PROBLEM 1 — chrono's reference date is the server's UTC "now".
//   "saturday at 6 AM" on Saturday (MST) resolved to the current UTC day's
//   most-recent Saturday, i.e. today — even though 6 AM had already passed.
//
// PROBLEM 2 — "tomorrow" is resolved relative to UTC midnight, not the user's
//   local midnight. At 10:13 PM MST the UTC date is already the next day, so
//   chrono's "tomorrow" overshot by one full day.
//
// PROBLEM 3 — chrono's default weekday resolution picks the *closest* past or
//   future occurrence. On a Thursday, "Tuesday" resolves to last Tuesday, not
//   next Tuesday.
//
// FIX STRATEGY
//   1. Compute the user's local "now" as a JS Date shifted by the tz offset.
//      Passing this as chrono's referenceDate makes all relative terms
//      (today/tomorrow/weekday) anchor to the user's calendar day.
//   2. Set chrono's `forwardDate: true` so weekday names always resolve to
//      the next future occurrence.
//   3. After chrono gives us a local-time Date, convert it to true UTC by
//      subtracting the DST-aware offset (computed via Intl, not a static table).
// ---------------------------------------------------------------------------

/**
 * Get current date/time expressed as if it were UTC but shifted so that
 * chrono treats it as the user's local "now".
 *
 * Chrono always works in the local JS environment (which is UTC on most
 * servers). By shifting the reference date we trick it into parsing
 * "tomorrow", "saturday", etc. relative to the user's calendar day.
 */
function getLocalReferenceDate(ianaTimezone, atDate = new Date()) {
  // Get the user's local wall-clock time components via Intl
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: ianaTimezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(atDate).map(({ type, value }) => [type, value])
  );
  // Build a Date that has those wall-clock values in UTC slots
  // e.g. if local time is 2026-06-20 22:13, return new Date('2026-06-20T22:13:00Z')
  return new Date(Date.UTC(
    +parts.year, +parts.month - 1, +parts.day,
    +parts.hour, +parts.minute, +parts.second
  ));
}

/**
 * Convert a Date that was parsed by chrono as if in UTC (but actually
 * represents a local wall-clock time) back to a true UTC timestamp.
 */
function localChronoDateToUTC(chronoDate, ianaTimezone) {
  // chronoDate.getUTC* fields hold the user's local wall-clock values
  const y   = chronoDate.getUTCFullYear();
  const mon = chronoDate.getUTCMonth();
  const d   = chronoDate.getUTCDate();
  const h   = chronoDate.getUTCHours();
  const min = chronoDate.getUTCMinutes();
  const sec = chronoDate.getUTCSeconds();

  // First approximation: treat those components as UTC
  const approx = new Date(Date.UTC(y, mon, d, h, min, sec));

  // Find what offset applies at roughly that moment in the target zone
  const offsetHours = getOffsetHoursViaIntl(ianaTimezone, approx);

  // True UTC = local wall-clock − offset
  return new Date(approx.getTime() - offsetHours * 3_600_000);
}

function getOffsetHoursViaIntl(ianaTimezone, atDate) {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: ianaTimezone,
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      hour12: false,
    });
    const parts = Object.fromEntries(
      fmt.formatToParts(atDate).map(({ type, value }) => [type, value])
    );
    const localMs = Date.UTC(
      +parts.year, +parts.month - 1, +parts.day,
      +parts.hour, +parts.minute, +parts.second
    );
    return (localMs - atDate.getTime()) / 3_600_000;
  } catch {
    return 0;
  }
}

export function parseDateTime(input, timezone, _referenceNow = new Date()) {
  if (!input || typeof input !== 'string') {
    return { success: false, error: 'Please provide a valid time input.' };
  }

  try {
    const trimmedInput = input.trim();
    const ianaTimezone = resolveTimezone(timezone);

    // Anchor chrono to the user's local "now" so that today/tomorrow/weekday
    // names resolve against the correct calendar day in their timezone.
    const localRef = getLocalReferenceDate(ianaTimezone, _referenceNow);

    const results = parse(trimmedInput, {
      referenceDate: localRef,
      // FIX BUG 3: always pick the next future weekday, never the past one.
      forwardDate: true,
    });

    if (results.length === 0) {
      return {
        success: false,
        error: `Could not parse: "${trimmedInput}". Try formats like "2026-06-14 7:42 AM", "tomorrow at 3pm", or "Friday 9:00 EST".`,
      };
    }

    // chrono returns a Date whose UTC fields hold the user's wall-clock values
    const chronoDate = results[0].start.date();

    // Convert to true UTC using a DST-aware offset (fixes the static-table bug)
    const utcDate = localChronoDateToUTC(chronoDate, ianaTimezone);

    // Edge-case for "today at X": if the resolved time is in the past
    // (the hour has already passed today in the user's timezone), advance by 1 day.
    // chrono's forwardDate handles weekdays but not the "today" same-day edge case.
    const inputLower = trimmedInput.toLowerCase();
    const isTodayRef = /^today\b/.test(inputLower);
    if (isTodayRef && utcDate <= _referenceNow) {
      utcDate.setUTCDate(utcDate.getUTCDate() + 1);
    }

    return {
      success: true,
      timestamp: utcDate.getTime(),
      parsedDate: utcDate,
      timezone: timezone,
    };
  } catch (error) {
    console.error('Date parsing error:', error);
    return {
      success: false,
      error: 'An error occurred while parsing the date. Please try a different format.',
    };
  }
}

// parseRelativeTime is unchanged — it works in pure millisecond arithmetic
// and doesn't involve timezone-relative calendar days, so it was never buggy.
export function parseRelativeTime(input) {
  if (!input || typeof input !== 'string') {
    return { success: false, error: 'Please provide a valid time input.' };
  }

  try {
    const trimmedInput = input.trim().toLowerCase();

    const patterns = [
      { regex: /(\d+)\s*(day|days)\s*(and)?\s*(\d+)?\s*(hour|hours|hr|hrs)?/i,     type: 'days' },
      { regex: /(\d+)\s*(hour|hours|hr|hrs)\s*(and)?\s*(\d+)?\s*(minute|minutes|min)?/i, type: 'hours' },
      { regex: /(\d+)\s*(minute|minutes|min)\s*(and)?\s*(\d+)?\s*(second|seconds|sec)?/i, type: 'minutes' },
      { regex: /(\d+)\s*(week|weeks)/i,                                              type: 'weeks' },
      { regex: /(\d+)\s*(second|seconds|sec)/i,                                      type: 'seconds' },
    ];

    let totalMs = 0;
    let matched = false;

    for (const pattern of patterns) {
      const match = trimmedInput.match(pattern.regex);
      if (match) {
        matched = true;
        const value = parseInt(match[1]);
        switch (pattern.type) {
          case 'days':
            totalMs += value * 86_400_000;
            if (match[4]) totalMs += parseInt(match[4]) * 3_600_000;
            break;
          case 'hours':
            totalMs += value * 3_600_000;
            if (match[4]) totalMs += parseInt(match[4]) * 60_000;
            break;
          case 'minutes':
            totalMs += value * 60_000;
            if (match[4]) totalMs += parseInt(match[4]) * 1000;
            break;
          case 'weeks':
            totalMs += value * 7 * 86_400_000;
            break;
          case 'seconds':
            totalMs += value * 1000;
            break;
        }
      }
    }

    if (!matched) {
      return {
        success: false,
        error: `Could not parse: "${trimmedInput}". Try formats like "5 hours", "30 minutes", "2 days and 3 hours", "1 week".`,
      };
    }

    const futureTime = new Date(Date.now() + totalMs);
    return {
      success: true,
      timestamp: futureTime.getTime(),
      parsedDate: futureTime,
      relativeInput: input,
    };
  } catch (error) {
    console.error('Relative time parsing error:', error);
    return {
      success: false,
      error: 'An error occurred while parsing the relative time.',
    };
  }
}
