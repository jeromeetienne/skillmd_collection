// node imports
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// local imports
import { DatetimeFormatter } from '../src/datetime-formatter.js';

const FIXED_INSTANT = new Date('2026-03-17T10:45:00Z');

describe('DatetimeFormatter.formatDate', () => {
	it('formats an instant as YYYY-MM-DD in the given timezone', () => {
		assert.equal(DatetimeFormatter.formatDate(FIXED_INSTANT, 'UTC'), '2026-03-17');
	});

	it('shifts the calendar date according to the timezone', () => {
		// 02:30 UTC on the 17th is still the 16th in Los Angeles (UTC-7 in March)
		const nearMidnight = new Date('2026-03-17T02:30:00Z');
		assert.equal(DatetimeFormatter.formatDate(nearMidnight, 'UTC'), '2026-03-17');
		assert.equal(DatetimeFormatter.formatDate(nearMidnight, 'America/Los_Angeles'), '2026-03-16');
	});

	it('defaults to the system timezone and still yields a YYYY-MM-DD shape', () => {
		assert.match(DatetimeFormatter.formatDate(FIXED_INSTANT), /^\d{4}-\d{2}-\d{2}$/);
	});

	it('throws on an invalid timezone', () => {
		assert.throws(() => DatetimeFormatter.formatDate(FIXED_INSTANT, 'Not/AZone'), RangeError);
	});
});

describe('DatetimeFormatter.formatDatetime', () => {
	it('includes the date, time and timezone name', () => {
		const out = DatetimeFormatter.formatDatetime(FIXED_INSTANT, 'UTC');
		// whitespace around AM/PM varies by ICU version (regular vs narrow no-break space)
		assert.match(out, /03\/17\/2026,\s+10:45:00\s+AM\s+UTC/);
	});

	it('renders the time in the requested timezone', () => {
		const out = DatetimeFormatter.formatDatetime(FIXED_INSTANT, 'America/New_York');
		// 10:45 UTC == 06:45 EDT on 2026-03-17
		assert.match(out, /03\/17\/2026,\s+06:45:00\s+AM\s+(EDT|GMT-4)/);
	});

	it('defaults to the system timezone without throwing', () => {
		assert.match(DatetimeFormatter.formatDatetime(FIXED_INSTANT), /\d{2}\/\d{2}\/\d{4}/);
	});
});
