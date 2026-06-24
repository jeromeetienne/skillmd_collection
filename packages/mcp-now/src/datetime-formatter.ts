export class DatetimeFormatter {
	static formatDatetime(date: Date, timezone?: string): string {
		const options: Intl.DateTimeFormatOptions = {
			timeZone: timezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			timeZoneName: 'short',
		};
		return new Intl.DateTimeFormat('en-US', options).format(date);
	}

	static formatDate(date: Date, timezone?: string): string {
		const options: Intl.DateTimeFormatOptions = {
			timeZone: timezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
		};
		return new Intl.DateTimeFormat('en-CA', options).format(date);
	}
}
