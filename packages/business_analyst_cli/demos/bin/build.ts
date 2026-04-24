import Path from 'node:path'
import Fs from 'node:fs'
import { mdToPdf } from "md-to-pdf";

async function main() {
	const inputsFolderPath = Path.resolve(__dirname, '../inputs');
	const outputsFolderPath = Path.resolve(__dirname, '../outputs');
	const descriptionsFolderPath = Path.resolve(__dirname, '../descriptions');
	const reportsMdFolderPath = Path.resolve(__dirname, '../reports_md');
	const reportsPdfFolderPath = Path.resolve(__dirname, '../reports_pdf');

	const folderEntries = await Fs.promises.readdir(inputsFolderPath, { withFileTypes: true });
	// Keep only the file *.input.txt
	const demoBasenames = folderEntries.filter((entry) => {
		return entry.isFile() && entry.name.endsWith('.input.txt');
	}).map((entry) => {
		return entry.name.replace('.input.txt', '');
	});

	for (const demoBasename of demoBasenames) {
		const inputFilePath = Path.join(inputsFolderPath, `${demoBasename}.input.txt`);
		const outputFilePath = Path.join(outputsFolderPath, `${demoBasename}.output.txt`);
		const descriptionFilePath = Path.join(descriptionsFolderPath, `${demoBasename}.md`)
		const reportMdFilePath = Path.join(reportsMdFolderPath, `${demoBasename}.report.md`)
		const reportPdfFilePath = Path.join(reportsPdfFolderPath, `${demoBasename}.report.pdf`)

		// debugger

		const outputContent = await Fs.promises.readFile(outputFilePath, 'utf-8');

		const descriptionContent = await Fs.promises.readFile(descriptionFilePath, 'utf-8');
		// descriptionTitle === first line of descriptionContent
		// descriptionBody === rest of descriptionContent
		const [descriptionTitle, ...descriptionBodyLines] = descriptionContent.split('\n');
		const descriptionBody = descriptionBodyLines.join('\n').trim();

		let reportContent = ''
		reportContent += `${descriptionTitle}\n`;
		reportContent += `\n`;
		reportContent += `## Description\n`;
		reportContent += `${descriptionBody}\n`;
		reportContent += `\n`;
		reportContent += `\n`;
		reportContent += `## Demo\n`;
		reportContent += outputContent;

		// Write reportContent to reportFilePath
		await Fs.promises.writeFile(reportMdFilePath, reportContent, 'utf-8');
		console.log(`Report for demo "${demoBasename}" has been generated at: ${reportMdFilePath}`);

		// convert markdown to PDF using md-to-pdf
		await mdToPdf({ path: reportMdFilePath }, { dest: reportPdfFilePath });
		console.log(`PDF report for demo "${demoBasename}" has been generated at: ${reportPdfFilePath}`);
	}
}
main().catch((err) => {
	console.error('Error in main:', err);
	process.exit(1);
});