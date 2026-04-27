// node imports
import Fs from "node:fs"
import Os from "node:os"
import Path from "node:path";

// npm imports
import Puppeteer from 'puppeteer';
import * as PdfToImg from "pdf-to-img";
import { OpenAI } from "openai";


export class UtilsPdf {

	/**
	 * Convert a PDF buffer to Markdown using an LLM.
	 * 
	 * @param openaiClient The OpenAI client instance.
	 * @param pdfBuffer The PDF file as a Buffer.
	 * @param param2 Optional parameters, including the model name.
	 * @returns A promise that resolves to the generated Markdown string.
	 */
	static async pdf2MarkdownByLlm(openaiClient: OpenAI, pdfBuffer: Buffer, {
		modelName = 'gpt-4o'
	}: {
		modelName?: string
	} = {}): Promise<string> {
		const imageBuffers = await UtilsPdf._pdf2images(pdfBuffer);

		const response = await openaiClient.responses.parse({
			model: modelName,
			max_output_tokens: 4096,
			input: [
				{
					role: "user",
					content: [
						...imageBuffers.map((imageBuffer) => ({
							type: "input_image" as const,
							image_url: `data:image/png;base64,${imageBuffer.toString('base64')}`,
							detail: "auto" as const,
						})),
						{
							type: "input_text" as const,
							text: [
								"Convert these PDF pages to well-structured markdown.",
								"Preserve headings, lists, tables, and emphasis.",
								"Output only the markdown content without any explanations and no codeblocks.",
							].join("\n"),
						},
					],
				},
			],
		});

		if (response.output_text === null) {
			throw new Error("Failed to convert PDF to Markdown. The LLM did not return any content.");
		}
		const markdown = response.output_text;

		return markdown;
	}

	/**
	 * Convert a PDF buffer to an array of image buffers, one for each page.
	 * @param pdfBuffer The PDF file as a Buffer.
	 * @returns A promise that resolves to an array of Buffers, each representing a page of the PDF as an image.
	 */
	private static async _pdf2images(pdfBuffer: Buffer): Promise<Buffer[]> {
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