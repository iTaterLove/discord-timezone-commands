import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.join(__dirname, '../db');
const TIMEZONE_DB = path.join(DB_DIR, 'timezones.json');

// Ensure db directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initialize timezone database
if (!fs.existsSync(TIMEZONE_DB)) {
  fs.writeFileSync(TIMEZONE_DB, JSON.stringify({}));
}

// Comprehensive list of valid timezones
const VALID_TIMEZONES = [
  // UTC
  'UTC', 'GMT',
  
  // US/Canada Eastern
  'EST', 'EDT', 'ET',
  
  // US/Canada Central
  'CST', 'CDT', 'CT',
  
  // US/Canada Mountain
  'MST', 'MDT', 'MT',
  
  // US/Canada Pacific
  'PST', 'PDT', 'PT',
  
  // Alaska/Hawaii
  'AKST', 'AKDT', 'HST', 'HDT',
  
  // Europe
  'WET', 'WEST', 'CET', 'CEST', 'EET', 'EEST',
  'BST', 'IST', 'WIB', 'WITA', 'WIT',
  
  // Asia
  'IST', 'PKT', 'BDT', 'IDT',
  'JST', 'KST', 'CST', 'SGT', 'PHT', 'MYT', 'BNT', 'THT',
  'HKT', 'TWT', 'VN',
  
  // Australia
  'AWST', 'ACST', 'AEST', 'AEDT', 'ACDT', 'AWDT',
  
  // Middle East
  'GST', 'AST', 'AZT', 'MSK', 'EEST',
  
  // South America
  'ART', 'BRT', 'BRST', 'VET', 'CLT', 'CLST',
  
  // Africa
  'CAT', 'SAST', 'EAT', 'WET',
  
  // Pacific
  'NZST', 'NZDT', 'FJT', 'TOT', 'SBT', 'VUT',
];

export function getAllTimezones() {
  return [...new Set(VALID_TIMEZONES)].sort();
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
  return VALID_TIMEZONES.includes(tz.toUpperCase());
}

// Timezone offset mappings (in hours from UTC)
export const TIMEZONE_OFFSETS = {
  // UTC
  'UTC': 0, 'GMT': 0,
  
  // US Eastern (winter/summer)
  'EST': -5, 'EDT': -4, 'ET': -5,
  
  // US Central (winter/summer)
  'CST': -6, 'CDT': -5, 'CT': -6,
  
  // US Mountain (winter/summer)
  'MST': -7, 'MDT': -6, 'MT': -7,
  
  // US Pacific (winter/summer)
  'PST': -8, 'PDT': -7, 'PT': -8,
  
  // Alaska
  'AKST': -9, 'AKDT': -8,
  
  // Hawaii
  'HST': -10, 'HDT': -9,
  
  // Western Europe (winter/summer)
  'WET': 0, 'WEST': 1,
  
  // Central Europe (winter/summer)
  'CET': 1, 'CEST': 2,
  
  // Eastern Europe (winter/summer)
  'EET': 2, 'EEST': 3,
  
  // UK
  'BST': 1, 'IST': 1,
  
  // East Africa
  'EAT': 3,
  
  // South Africa
  'SAST': 2,
  
  // Central Africa
  'CAT': 2,
  
  // West Africa
  'WIB': 7, 'WITA': 8, 'WIT': 9,
  
  // Middle East
  'MSK': 3, 'GST': 4, 'AST': 3, 'AZT': 4,
  
  // South Asia
  'PKT': 5, 'IST': 5.5, 'BDT': 6, 'IDT': 6.5,
  
  // Southeast Asia
  'THA': 7, 'JST': 9, 'KST': 9, 'CST': 8,
  'SGT': 8, 'PHT': 8, 'MYT': 8, 'BNT': 8, 'THT': 7,
  'HKT': 8, 'TWT': 8, 'VN': 7,
  
  // Australia (varies by region)
  'AWST': 8, 'ACST': 9.5, 'AEST': 10, 'AEDT': 11, 'ACDT': 10.5, 'AWDT': 9,
  
  // New Zealand
  'NZST': 12, 'NZDT': 13,
  
  // Pacific
  'FJT': 12, 'TOT': 13, 'SBT': 11, 'VUT': 11,
  
  // South America
  'ART': -3, 'BRT': -3, 'BRST': -2, 'VET': -4, 'CLT': -3, 'CLST': -2,
};

export function getTimezoneOffset(timezone) {
  const tz = timezone.toUpperCase();
  return TIMEZONE_OFFSETS[tz] || 0;
}
