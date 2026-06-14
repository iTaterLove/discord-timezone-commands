import { parse } from 'chrono-node';
import { getTimezoneOffset } from './timezone.js';

const DATE_FORMATS = [
  // Common date formats
  /^\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}\s*(AM|PM)?\s*(\w{3,})?$/i, // 2026-06-14 7:42 AM EST
  /^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}\s*(AM|PM)?\s*(\w{3,})?$/i, // 06/14/2026 7:42 AM EST
  /^\d{1,2}-\d{1,2}-\d{4}\s+\d{1,2}:\d{2}\s*(AM|PM)?\s*(\w{3,})?$/i, // 06-14-2026 7:42 AM EST
  /^(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*(at)?\s*\d{1,2}:\d{2}\s*(AM|PM)?\s*(\w{3,})?$/i,
  /^(next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*(at)?\s*\d{1,2}:\d{2}\s*(AM|PM)?\s*(\w{3,})?$/i,
];

export function parseDateTime(input, timezone) {
  if (!input || typeof input !== 'string') {
    return {
      success: false,
      error: 'Please provide a valid time input.',
    };
  }

  try {
    const trimmedInput = input.trim();
    
    // Try to parse with chrono
    const results = parse(trimmedInput);
    
    if (results.length === 0) {
      return {
        success: false,
        error: `Could not parse: "${trimmedInput}". Try formats like "2026-06-14 7:42 AM", "tomorrow at 3pm", or "Friday 9:00 EST".`,
      };
    }

    let date = results[0].start.date();
    
    // Handle timezone offset
    const tzOffsetHours = getTimezoneOffset(timezone);
    const utcDate = new Date(date.getTime() - tzOffsetHours * 60 * 60 * 1000);
    
    return {
      success: true,
      timestamp: utcDate.getTime(),
      parsedDate: date,
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

export function parseRelativeTime(input) {
  if (!input || typeof input !== 'string') {
    return {
      success: false,
      error: 'Please provide a valid time input.',
    };
  }

  try {
    const trimmedInput = input.trim().toLowerCase();
    
    // Regex patterns for relative time
    const patterns = [
      { regex: /(\d+)\s*(day|days)\s*(and)?\s*(\d+)?\s*(hour|hours|hr|hrs)?/i, type: 'days' },
      { regex: /(\d+)\s*(hour|hours|hr|hrs)\s*(and)?\s*(\d+)?\s*(minute|minutes|min)?/i, type: 'hours' },
      { regex: /(\d+)\s*(minute|minutes|min)\s*(and)?\s*(\d+)?\s*(second|seconds|sec)?/i, type: 'minutes' },
      { regex: /(\d+)\s*(week|weeks)/i, type: 'weeks' },
      { regex: /(\d+)\s*(second|seconds|sec)/i, type: 'seconds' },
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
            totalMs += value * 24 * 60 * 60 * 1000;
            if (match[4]) {
              totalMs += parseInt(match[4]) * 60 * 60 * 1000;
            }
            break;
          case 'hours':
            totalMs += value * 60 * 60 * 1000;
            if (match[4]) {
              totalMs += parseInt(match[4]) * 60 * 1000;
            }
            break;
          case 'minutes':
            totalMs += value * 60 * 1000;
            if (match[4]) {
              totalMs += parseInt(match[4]) * 1000;
            }
            break;
          case 'weeks':
            totalMs += value * 7 * 24 * 60 * 60 * 1000;
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

    const now = new Date();
    const futureTime = new Date(now.getTime() + totalMs);

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
