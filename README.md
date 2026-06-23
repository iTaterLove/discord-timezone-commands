# discord-timezone-commands

A Discord.js bot that converts natural-language time expressions into [Discord timestamps](https://discord.com/developers/docs/reference#message-formatting-timestamp-styles) — `<t:N:f>` codes that automatically display in each viewer's local timezone.

## Commands

### `/at`

Generate a Discord timestamp from a human-readable time expression.

```
/at time:"tomorrow at 3pm" timezone:MST
/at time:"saturday at 6 AM" timezone:EST
/at time:"tuesday at 3 pm"
/at time:"2026-06-14 7:42 AM" timezone:PST
```

**Options**

| Option | Required | Description |
|--------|----------|-------------|
| `time` | ✅ | Natural language time (see formats below) |
| `timezone` | ❌ | Timezone abbreviation or IANA identifier. Falls back to your saved timezone. |

The bot replies with an embed showing the raw `<t:N:f>` code and a live preview. Copy the code into any message and every reader sees it in their own local time.

---

## Supported time formats

| Input | Meaning |
|-------|---------|
| `tomorrow at 3pm` | Next calendar day at 3:00 PM in your timezone |
| `saturday at 6 AM` | The next upcoming Saturday at 6:00 AM |
| `tuesday at 3 pm` | The next upcoming Tuesday at 3:00 PM |
| `next friday at noon` | The Friday of next week at 12:00 PM |
| `today at 5pm` | Today at 5 PM (or tomorrow if 5 PM has already passed) |
| `2026-06-14 7:42 AM` | Absolute date and time |
| `06/14/2026 7:42 AM` | MM/DD/YYYY format |
| `Friday 9:00 EST` | Nearest upcoming Friday at 9 AM Eastern |

### Timezone identifiers

Both abbreviations and full IANA identifiers are accepted.

**Abbreviations**

| Abbreviation | Zone |
|---|---|
| `EST` / `EDT` / `ET` | US Eastern |
| `CST` / `CDT` / `CT` | US Central |
| `MST` / `MDT` / `MT` | US Mountain |
| `PST` / `PDT` / `PT` | US Pacific |
| `AKST` / `AKDT` | Alaska |
| `HST` | Hawaii |
| `UTC` / `GMT` | Coordinated Universal Time |
| `CET` / `CEST` | Central Europe |
| `JST` | Japan |
| `IST` | India (UTC+5:30) |

> **Note on ambiguous abbreviations:** `IST` maps to India Standard Time (UTC+5:30). `CST` maps to US Central, not China Standard Time. `AST` maps to Arabia Standard Time. If you need a different meaning, use the full IANA identifier (e.g. `Asia/Shanghai`, `America/Halifax`).

**IANA identifiers** (always unambiguous, handle DST automatically)

```
America/New_York  America/Chicago  America/Denver  America/Los_Angeles
Europe/London  Europe/Paris  Asia/Tokyo  Asia/Kolkata  Australia/Sydney
```

Full list: [IANA Time Zone Database](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)

---

### `/in` (relative time)

Generate a timestamp for a duration from now.

```
/in time:"5 hours"
/in time:"2 days and 3 hours"
/in time:"30 minutes"
/in time:"1 week"
```

---

### `/timezone set`

Save your default timezone so you don't need to pass it every time.

```
/timezone set timezone:MST
/timezone set timezone:America/Denver
```

---

## Installation

### Prerequisites

- Node.js 18+
- A Discord bot token ([Discord Developer Portal](https://discord.com/developers/applications))

### Steps

```bash
git clone https://github.com/iTaterLove/discord-timezone-commands.git
cd discord-timezone-commands
npm install
```

Create a `.env` file:

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_id_here
GUILD_ID=your_test_server_id_here   # optional: for faster command registration during dev
```

Register slash commands with Discord:

```bash
node deploy-commands.js
```

Start the bot:

```bash
node index.js
```

---

## Project structure

```
discord-timezone-commands/
├── commands/
│   ├── at.js               # /at command — parses a time and returns a timestamp
│   └── timezone.js         # /timezone set command — saves user's default timezone
├── utils/
│   ├── dateParser.js       # Natural-language date parsing (wraps chrono-node)
│   ├── timestamp.js        # Discord <t:N:style> formatting helpers
│   └── timezone.js         # Abbreviation → IANA mapping, offset helpers, user DB
├── db/
│   └── timezones.json      # Per-user timezone preferences (auto-created)
├── deploy-commands.js      # Registers slash commands with the Discord API
├── index.js                # Bot entry point
└── README.md
```

---

## How date parsing works

`dateParser.js` uses [chrono-node](https://github.com/wanasit/chrono) to understand natural language, with two important adjustments:

**1. Timezone-aware reference date**
Chrono resolves relative terms like "tomorrow" and "saturday" relative to a reference date. Without intervention that reference is the server's UTC clock. The fix: before calling chrono, we compute the user's current local wall-clock time via `Intl.DateTimeFormat` and pass that as the reference date. This means "tomorrow" always means tomorrow in *your* timezone, not the server's.

**2. Forward-only weekday resolution**
Chrono's default is to find the *closest* occurrence of a weekday — which can be in the past. Setting `forwardDate: true` makes it always pick the next future occurrence, so "tuesday at 3 pm" on a Thursday gives you the coming Tuesday, not last Tuesday.

**3. DST-aware offset conversion**
After chrono produces a parsed date, we convert it to UTC using the current DST offset (via `Intl.DateTimeFormat`), not a static table. This means "6 AM MST" in summer correctly applies UTC-6 (MDT) rather than UTC-7.

---

## Contributing

When modifying `dateParser.js` or `timezone.js`, run the logic test suite:

```bash
node test/test_logic.mjs
```

All 12 tests should pass. The suite covers DST-aware offsets, local reference date computation, and the UTC round-trip for all three originally reported bugs.

---

## License

MIT
