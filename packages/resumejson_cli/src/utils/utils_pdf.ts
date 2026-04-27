// node imports
import Fs from "node:fs"
import Os from "node:os"
import Path from "node:path";

// npm imports
import Puppeteer from 'puppeteer';
import * as PdfToImg from "pdf-to-img";
// import { OpenAI } from "openai";


export class UtilsPdf {

	/**
	 * Convert a PDF buffer to an array of image buffers, one for each page.
	 * @param pdfBuffer The PDF file as a Buffer.
	 * @returns A promise that resolves to an array of Buffers, each representing a page of the PDF as an image.
	 */
	static async pdf2images(pdfBuffer: Buffer): Promise<Buffer[]> {
		// write the pdf buffer to a temporary file
		const tempPdfPath = Path.resolve(Os.tmpdir(), `temp_resumeai_${Date.now()}.pdf`);
		await Fs.promises.writeFile(tempPdfPath, pdfBuffer);

		// convert the pdf to images
		const imageBuffers: Buffer[] = [];
		for await (const page of await PdfToImg.pdf(tempPdfPath, { scale: 2 })) {
			imageBuffers.push(Buffer.from(page));
		}

		// delete the temporary pdf file
		await Fs.promises.unlink(tempPdfPath);

		return imageBuffers;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	/**
	 * Convert a rendered HTML string to a PDF buffer using Puppeteer.
	 * @param renderedHtml The rendered HTML string.
	 * @returns A promise that resolves to the generated PDF buffer.
	 */
	static async html2pdf(renderedHtml: string): Promise<Buffer> {
		// launch puppeteer
		const browser = await Puppeteer.launch({
			args: [
				// options to allow local file access
				'--allow-file-access-from-files',
				'--enable-local-file-accesses',
				'--no-sandbox',
				'--disable-setuid-sandbox'
			]
		});

		// load the rendered html in a new page
		const page = await browser.newPage();
		await page.setContent(renderedHtml, { waitUntil: 'load' });
		await page.emulateMediaType('screen');
		// Generate the PDF - A4 format- print background graphics (aka background colors)
		const resumePdf = await page.pdf({
			format: 'A4',
			printBackground: true,
			scale: 1.0,
			waitForFonts: true,
			preferCSSPageSize: true,
		});

		// Close the browser
		await browser.close();

		// Convert the PDF buffer to a Node.js Buffer and return it
		const pdfBuffer = Buffer.from(resumePdf);

		// Return the rendered HTML and PDF buffers
		return pdfBuffer
	}
}