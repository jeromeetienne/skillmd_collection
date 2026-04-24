// npm imports
import { BskyAgent, type BlobRef } from '@atproto/api';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Types
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

type LinkCardEmbed = {
	$type: 'app.bsky.embed.external';
	external: {
		uri: string;
		title: string;
		description: string;
		thumb?: BlobRef;
	};
};

type OgMetadata = {
	title: string;
	description: string;
	imageUrl: string | null;
};

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	BskyLinkCard
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

export class BskyLinkCard {
	/**
	 * Extract the first URL from text
	 */
	static extractUrl(text: string): string | null {
		const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/i;
		const match = text.match(urlRegex);
		if (match === null) {
			return null;
		}
		// Strip trailing punctuation that's likely not part of the URL
		return match[0].replace(/[.,;:!?)]+$/, '');
	}

	/**
	 * Fetch Open Graph metadata from a URL
	 */
	static async fetchOgMetadata(url: string): Promise<OgMetadata> {
		const response = await fetch(url, {
			headers: {
				'User-Agent': 'bsky_cli/1.0 (link-card-preview)',
				'Accept': 'text/html',
			},
			redirect: 'follow',
			signal: AbortSignal.timeout(10_000),
		});

		if (response.ok === false) {
			return { title: url, description: '', imageUrl: null };
		}

		const html = await response.text();

		const title = BskyLinkCard._extractMetaContent(html, 'og:title')
			?? BskyLinkCard._extractHtmlTitle(html)
			?? url;
		const description = BskyLinkCard._extractMetaContent(html, 'og:description')
			?? BskyLinkCard._extractMetaContent(html, 'description')
			?? '';
		const imageUrl = BskyLinkCard._extractMetaContent(html, 'og:image') ?? null;

		return { title, description, imageUrl };
	}

	/**
	 * Build a link card embed for a post. Returns null if no URL is found.
	 */
	static async buildLinkCardEmbed(agent: BskyAgent, text: string): Promise<LinkCardEmbed | null> {
		const url = BskyLinkCard.extractUrl(text);
		if (url === null) {
			return null;
		}

		let metadata: OgMetadata;
		try {
			metadata = await BskyLinkCard.fetchOgMetadata(url);
		} catch (_error) {
			// If we can't fetch metadata, create a minimal card
			metadata = { title: url, description: '', imageUrl: null };
		}

		const embed: LinkCardEmbed = {
			$type: 'app.bsky.embed.external',
			external: {
				uri: url,
				title: metadata.title,
				description: metadata.description,
			},
		};

		// Upload thumbnail if available
		if (metadata.imageUrl !== null) {
			try {
				const thumbBlob = await BskyLinkCard._uploadThumbnail(agent, metadata.imageUrl);
				if (thumbBlob !== null) {
					embed.external.thumb = thumbBlob;
				}
			} catch (_error) {
				// Post without thumbnail if upload fails
			}
		}

		return embed;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Private Helpers
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	/**
	 * Extract content from a meta tag by property or name attribute
	 */
	private static _extractMetaContent(html: string, property: string): string | null {
		// Match property="og:title" or name="description"
		const regex = new RegExp(
			`<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']` +
			`|<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
			'i'
		);
		const match = html.match(regex);
		if (match === null) {
			return null;
		}
		const value = match[1] ?? match[2];
		if (value === undefined) {
			return null;
		}
		return BskyLinkCard._decodeHtmlEntities(value);
	}

	/**
	 * Extract the <title> tag content as fallback
	 */
	private static _extractHtmlTitle(html: string): string | null {
		const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
		if (match === null) {
			return null;
		}
		return BskyLinkCard._decodeHtmlEntities(match[1].trim());
	}

	/**
	 * Decode common HTML entities
	 */
	private static _decodeHtmlEntities(text: string): string {
		return text
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&quot;/g, '"')
			.replace(/&#039;/g, "'")
			.replace(/&#x27;/g, "'")
			.replace(/&#39;/g, "'");
	}

	/**
	 * Download an image and upload it as a blob to Bluesky
	 */
	private static async _uploadThumbnail(
		agent: BskyAgent,
		imageUrl: string
	): Promise<BlobRef | null> {
		const response = await fetch(imageUrl, {
			headers: {
				'User-Agent': 'bsky_cli/1.0 (link-card-preview)',
				'Accept': 'image/*',
			},
			redirect: 'follow',
			signal: AbortSignal.timeout(10_000),
		});

		if (response.ok === false) {
			return null;
		}

		const contentType = response.headers.get('content-type') ?? 'image/jpeg';
		const mimeType = contentType.split(';')[0].trim();
		const arrayBuffer = await response.arrayBuffer();
		const uint8Array = new Uint8Array(arrayBuffer);

		// Bluesky has a 1MB limit for blob uploads
		if (uint8Array.byteLength > 1_000_000) {
			return null;
		}

		const uploadResponse = await agent.uploadBlob(uint8Array, { encoding: mimeType });

		return uploadResponse.data.blob;
	}
}
