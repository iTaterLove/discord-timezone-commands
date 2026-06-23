import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.join(__dirname, '../db');
const TIMEZONE_DB = path.join(DB_DIR, 'timezones.json');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
if (!fs.existsSync(TIMEZONE_DB)) {
  fs.writeFileSync(TIMEZONE_DB, JSON.stringify({}));
}

// ---------------------------------------------------------------------------
// Abbreviation → IANA identifier
//
// FIX: The old code used a static offset table (e.g. MST = -7 always).
// That broke DST: Denver in summer is MDT (UTC-6), not MST (UTC-7).
// By mapping to IANA identifiers we let the Intl API resolve the correct
// offset for any given moment, handling DST automatically.
//
// Ambiguous abbreviations (IST = India / Ireland / Israel, CST = US Central /
// China, AST = Arabia / Atlantic) are resolved to their most common usage;
// users who need the other meaning should use the full IANA string.
// ---------------------------------------------------------------------------
const ABBR_TO_IANA = {
  // UTC / GMT
  UTC:  'UTC',
  GMT:  'UTC',

  // US / Canada Eastern
  EST:  'America/New_York',
  EDT:  'America/New_York',
  ET:   'America/New_York',

  // US / Canada Central
  CST:  'America/Chicago',
  CDT:  'America/Chicago',
  CT:   'America/Chicago',

  // US / Canada Mountain
  MST:  'America/Denver',
  MDT:  'America/Denver',
  MT:   'America/Denver',

  // US / Canada Pacific
  PST:  'America/Los_Angeles',
  PDT:  'America/Los_Angeles',
  PT:   'America/Los_Angeles',

  // Alaska
  AKST: 'America/Anchorage',
  AKDT: 'America/Anchorage',

  // Hawaii (no DST)
  HST:  'Pacific/Honolulu',
  HDT:  'Pacific/Honolulu',

  // Western Europe
  WET:  'Europe/Lisbon',
  WEST: 'Europe/Lisbon',

  // Central Europe
  CET:  'Europe/Paris',
  CEST: 'Europe/Paris',

  // Eastern Europe
  EET:  'Europe/Helsinki',
  EEST: 'Europe/Helsinki',

  // UK / Ireland
  BST:  'Europe/London',

  // India (IST = UTC+5:30)
  IST:  'Asia/Kolkata',

  // Middle East / Russia
  MSK:  'Europe/Moscow',
  GST:  'Asia/Dubai',
  AST:  'Asia/Riyadh',   // Arabia Standard Time; Atlantic is 'America/Halifax'
  AZT:  'Asia/Baku',
  IDT:  'Asia/Jerusalem',

  // South / Southeast Asia
  PKT:  'Asia/Karachi',
  BDT:  'Asia/Dhaka',
  WIB:  'Asia/Jakarta',
  WITA: 'Asia/Makassar',
  WIT:  'Asia/Jayapura',
  JST:  'Asia/Tokyo',
  KST:  'Asia/Seoul',
  SGT:  'Asia/Singapore',
  PHT:  'Asia/Manila',
  MYT:  'Asia/Kuala_Lumpur',
  BNT:  'Asia/Brunei',
  THT:  'Asia/Bangkok',   // Thailand (not to be confused with 'THA')
  HKT:  'Asia/Hong_Kong',
  TWT:  'Asia/Taipei',
  VN:   'Asia/Ho_Chi_Minh',

  // Australia
  AWST: 'Australia/Perth',
  ACST: 'Australia/Darwin',
  AEST: 'Australia/Brisbane',
  AEDT: 'Australia/Sydney',
  ACDT: 'Australia/Adelaide',
  AWDT: 'Australia/Perth',

  // New Zealand
  NZST: 'Pacific/Auckland',
  NZDT: 'Pacific/Auckland',

  // Pacific
  FJT:  'Pacific/Fiji',
  TOT:  'Pacific/Tongatapu',
  SBT:  'Pacific/Guadalcanal',
  VUT:  'Pacific/Efate',

  // Africa
  EAT:  'Africa/Nairobi',
  SAST: 'Africa/Johannesburg',
  CAT:  'Africa/Harare',
  WAT:  'Africa/Lagos',

  // South America
  ART:  'America/Argentina/Buenos_Aires',
  BRT:  'America/Sao_Paulo',
  BRST: 'America/Sao_Paulo',
  VET:  'America/Caracas',
  CLT:  'America/Santiago',
  CLST: 'America/Santiago',
};

/**
 * Resolve an abbreviation or IANA string to a canonical IANA identifier.
 * Falls back to 'UTC' if unrecognised.
 */
export function resolveTimezone(tz) {
  if (!tz) return 'UTC';
  const upper = tz.toUpperCase();
  // Already an IANA identifier (contains '/')
  if (tz.includes('/')) return tz;
  return ABBR_TO_IANA[upper] ?? 'UTC';
}

/**
 * Return the UTC offset in fractional hours for a timezone at a given moment.
 * Uses Intl so DST is handled correctly.
 *
 * FIX: replaces the old static TIMEZONE_OFFSETS lookup which hardcoded MST=-7
 * even in summer when Denver is actually MDT (UTC-6).
 */
export function getTimezoneOffset(tz, atDate = new Date()) {
  const ianaId = resolveTimezone(tz);
  try {
    // Intl gives us the offset via formatting a known UTC moment and comparing
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: ianaId,
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      hour12: false,
    });
    const parts = Object.fromEntries(
      formatter.formatToParts(atDate).map(({ type, value }) => [type, value])
    );
    const localMs = Date.UTC(
      +parts.year, +parts.month - 1, +parts.day,
      +parts.hour, +parts.minute, +parts.second
    );
    return (localMs - atDate.getTime()) / 3_600_000; // positive = east of UTC
  } catch {
    return 0;
  }
}

export function getAllTimezones() {
  return Object.keys(ABBR_TO_IANA).sort();
}

export function getUserTimezone(userId) {
  try {
    const data = JSON.parse(fs.readFileSync(TIMEZONE_DB, 'utf8'));
    return data[userId] || 'UTC';
  } catch (error) {
    console.error('Error reading timezone database:', error);
    return 'UTC';
  }
}

export function setUserTimezone(userId, timezone) {
  try {
    const data = JSON.parse(fs.readFileSync(TIMEZONE_DB, 'utf8'));
    data[userId] = timezone.toUpperCase();
    fs.writeFileSync(TIMEZONE_DB, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing timezone database:', error);
  }
}

export function isValidTimezone(tz) {
  if (!tz) return false;
  if (tz.includes('/')) {
    // Validate IANA string by attempting to use it
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }
  return tz.toUpperCase() in ABBR_TO_IANA;
}
