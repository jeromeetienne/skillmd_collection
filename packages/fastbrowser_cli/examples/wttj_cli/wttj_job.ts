#!/usr/bin/env npx tsx
// Usage: npx tsx extract-wttj-job.ts <job-url>

import { FastBrowserHelper } from "./fastbrowser_helper.js";

///////////////////////////////////////////////////////////////////////////////

const ALL_STOPS = [
	'Descriptif du poste',
	'Missions clés',
	'What you will do',
	'Vos missions',
	'Vos principales missions',
	'Responsabilités',
	'Profil recherché',
	'About you',
	'Votre profil',
	'Le profil idéal',
	'Qui êtes-vous ?',
	'Location & Remote',
	'What we offer',
];

///////////////////////////////////////////////////////////////////////////////

class SnapshotParser {
	private lines: string[];

	constructor(snapshot: string) {
		this.lines = snapshot.split('\n');
	}

	private extractQuotedValue(line: string, token: string): string | null {
		const idx = line.indexOf(`${token} "`);
		if (idx === -1) return null;
		const start = idx + token.length + 2;
		const end = line.indexOf('"', start);
		if (end === -1) return null;
		return line.slice(start, end);
	}

	extractStaticTexts(): string[] {
		return this.lines
			.map(l => this.extractQuotedValue(l, 'StaticText'))
			.filter((v): v is string => v !== null && v.trim() !== '');
	}

	extractAfterHeading(headingText: string): string[] {
		const results: string[] = [];
		let found = false;
		for (const line of this.lines) {
			if (line.includes('heading "')) {
				const val = this.extractQuotedValue(line, 'heading');
				if (found) break;
				if (val === headingText) found = true;
				continue;
			}
			if (!found) continue;
			if (line.includes('StaticText "')) {
				const val = this.extractQuotedValue(line, 'StaticText');
				if (val === null || val.trim() === '') continue;
				if (ALL_STOPS.includes(val)) break;
				results.push(val);
			}
		}
		return results;
	}

	extractAfterStaticText(startLabel: string): string[] {
		const results: string[] = [];
		let found = false;
		for (const line of this.lines) {
			if (line.includes('heading "') && found) break;
			if (!line.includes('StaticText "')) continue;
			const val = this.extractQuotedValue(line, 'StaticText');
			if (val === null || val.trim() === '') continue;
			if (found) {
				if (ALL_STOPS.includes(val)) break;
				results.push(val);
			}
			if (val === startLabel) found = true;
		}
		return results;
	}

	findFirstSection(labels: string[]): string[] {
		for (const label of labels) {
			const result = this.extractAfterStaticText(label);
			if (result.length > 0) return result;
		}
		return [];
	}
}

///////////////////////////////////////////////////////////////////////////////

class WttjExtractor {
	static extractTitle(output: string): string {
		const match = output.match(/heading "(.+?)" level/);
		return match !== null ? match[1] : '(non trouvé)';
	}

	static printSection(title: string, lines: string[]): void {
		console.log(`\n=== ${title} ===`);
		if (lines.length === 0) {
			console.log('(non trouvé)');
			return;
		}
		console.log(lines.join('\n'));
	}

	static async run(jobUrl: string): Promise<void> {
		FastBrowserHelper.navigatePage(jobUrl);

		console.log('=== TITRE ===');
		const selectorOutput = FastBrowserHelper.querySelectors('heading[level="2"]', false);
		console.log(WttjExtractor.extractTitle(selectorOutput));

		const snapshot = FastBrowserHelper.takeSnapshot();
		const parser = new SnapshotParser(snapshot);

		let descriptif = parser.extractAfterHeading('Descriptif du poste');
		if (descriptif.length === 0) {
			descriptif = parser.extractAfterStaticText('Descriptif du poste');
		}
		WttjExtractor.printSection('DESCRIPTIF DU POSTE', descriptif);

		const missions = parser.findFirstSection([
			'Missions clés',
			'What you will do',
			'Vos missions',
			'Vos principales missions',
			'Responsabilités',
		]);
		WttjExtractor.printSection('MISSIONS CLÉS', missions);

		const profil = parser.findFirstSection([
			'Profil recherché',
			'About you',
			'Votre profil',
			'Le profil idéal',
			'Qui êtes-vous ?',
		]);
		WttjExtractor.printSection('PROFIL RECHERCHÉ', profil);
	}
}

///////////////////////////////////////////////////////////////////////////////

const jobUrl = process.argv[2];
if (jobUrl === undefined || jobUrl === '') {
	console.error('Usage: npx tsx extract-wttj-job.ts <job-url>');
	process.exit(1);
}

WttjExtractor.run(jobUrl).catch((err: unknown) => {
	console.error('Error:', err);
	process.exit(1);
});
