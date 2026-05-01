// npm imports
import Chalk from 'chalk';
import { minimatch } from 'minimatch'

///////////////////////////////////////////////////////////////////////////////
// Logger Type Definitions
///////////////////////////////////////////////////////////////////////////////

/** Supported log levels in order of severity */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
type LoggerPattern = { enable: boolean; glob: string; level: LogLevel };

///////////////////////////////////////////////////////////////////////////////
// Logger Class
///////////////////////////////////////////////////////////////////////////////

export type LoggerConfig = {
	/**
	 * If true, all log levels go to stderr. Otherwise, INFO and DEBUG go to stdout, WARN and ERROR go to stderr. 
	 * This is useful for environments like Docker where you want all logs to go to the same stream.
	 */
	allToStderr: boolean;
}

/**
 * Simple logging utility with severity levels, colored output, and metadata support
 */
export class Logger {
	static LEVEL = {
		DEBUG: 'DEBUG' as LogLevel,
		INFO: 'INFO' as LogLevel,
		WARN: 'WARN' as LogLevel,
		ERROR: 'ERROR' as LogLevel,
	}
	static DEFAULT_LEVEL: LogLevel = Logger.LEVEL.WARN
	/** Rank mapping for log level filtering */
	static LEVEL_RANK: Record<LogLevel, number> = {
		DEBUG: 3,
		INFO: 2,
		WARN: 1,
		ERROR: 0
	};
	/**
	 * Maximum length for filename in log output; longer names will be truncated with ellipsis. This is to prevent log lines 
	 * from becoming too long due to long file paths.
	 */
	private static readonly _maxFilenameLength: number = 30;

	/** Color scheme for each log level */
	private static readonly LEVEL_COLOR: Record<LogLevel, (s: string) => string> = {
		DEBUG: Chalk.gray,
		INFO: Chalk.cyan,
		WARN: Chalk.yellow,
		ERROR: Chalk.red,
	};

	// 
	private static readonly LoggerConfigDefault: LoggerConfig = {
		allToStderr: false,
	}
	private _loggerConfig: LoggerConfig = Logger.LoggerConfigDefault;

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	constructor
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	private readonly _absFilename: string;
	private readonly _filenameWithoutExt: string;
	private readonly _parsedPatterns: LoggerPattern[];

	/**
	 * Factory method to create a Logger from import.meta.url
	 * @param metaUrl - import.meta.url from the calling module
	 * @param minLevel - Minimum log level to display (defaults to WARN)
	 */
	static fromMetaUrl(metaUrl: string, loggerConfig: LoggerConfig = Logger.LoggerConfigDefault): Logger {
		// Use WHATWG URL (available in Node and browsers) instead of node:url.fileURLToPath
		// so this module stays browser-safe when bundled by Vite.
		const parsedUrl: URL = new URL(metaUrl);
		const absFilename: string = parsedUrl.pathname;
		return new Logger(absFilename, loggerConfig);
	}

	/**
	 * @param absFilename - Logger name (typically module path)
	 * @param minLevel - Minimum log level to display (defaults to INFO)
	 */
	private constructor(absFilename: string, loggerConfig: LoggerConfig) {
		this._absFilename = absFilename;
		this._loggerConfig = loggerConfig;

		// Strip file extension from filename for glob matching. Done with string ops
		// so this module avoids node:path and remains browser-safe.
		const lastDotIndex: number = this._absFilename.lastIndexOf('.');
		const lastSeparatorIndex: number = this._absFilename.lastIndexOf('/');
		const hasExtension: boolean = lastDotIndex !== -1 && lastDotIndex > lastSeparatorIndex;
		this._filenameWithoutExt = hasExtension === true
			? this._absFilename.slice(0, lastDotIndex)
			: this._absFilename;

		// parse LOGGER environment variable for log filtering patterns. `process` is
		// undefined in browsers, so guard the access.
		const loggerEnvVar: string | undefined = typeof process !== 'undefined'
			? process.env['LOGGER']
			: undefined;
		if (loggerEnvVar === undefined || loggerEnvVar === '') {
			this._parsedPatterns = [];
		} else {
			this._parsedPatterns = Logger.parseLoggerEnv(loggerEnvVar);

		}
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	log filtering logic based on LOGGER environment variable
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	/**
	 * LOGGER environment variable domain specific language:
	 * - comma separated list of patterns
	 *   - pattern1,pattern2,...,patternN
	 * Each pattern is:
	 * - {sign}{filename_glob}:{log_level}
	 * - sign: [-+] to add/remove filter
	 *   - if omitted, defaults to + (enable)
	 * - if log_level is omitted, it defaults to WARN
	 * - log_level can be one of DEBUG, INFO, WARN, ERROR
	 * - filename_glob is applied to __filename from import.meta.url without the file extension
	 *
	 * Example:
	 * - LOGGER="*strategy*" enables WARN logs for all loggers with "strategy" in their name
	 * - LOGGER="*:DEBUG" enables DEBUG logs for all loggers
	 * - LOGGER="*strategy:DEBUG" enables DEBUG logs for all loggers with "strategy" in their name
	 * - LOGGER="-*strategy:DEBUG" disables DEBUG logs for all loggers with "strategy" in their name
	 * - LOGGER="*trading-core*:INFO" enables INFO logs for all loggers in the trading-core package
	 * - LOGGER='**:INFO' npm run dev:batch enables INFO logs for all loggers
	 */
	private static parseLoggerEnv(loggerEnv: string): Array<LoggerPattern> {
		const loggerPatterns: Array<LoggerPattern> = [];
		for (const rawPattern of loggerEnv.split(',')) {
			const trimmedPattern = rawPattern.trim();
			if (trimmedPattern.length === 0) continue;

			let enable = true;
			let patternBody = trimmedPattern;
			if (patternBody.startsWith('-')) {
				enable = false;
				patternBody = patternBody.slice(1);
			} else if (patternBody.startsWith('+')) {
				patternBody = patternBody.slice(1);
			}

			const colonIndex = patternBody.lastIndexOf(':');
			let glob: string;
			let logLevel: LogLevel = Logger.DEFAULT_LEVEL;
			if (colonIndex !== -1) {
				const levelCandidate = patternBody.slice(colonIndex + 1).toUpperCase();
				if (levelCandidate in Logger.LEVEL_RANK) {
					glob = patternBody.slice(0, colonIndex);
					logLevel = levelCandidate as LogLevel;
				} else {
					glob = patternBody;
				}
			} else {
				glob = patternBody;
			}
			const loggerPattern: LoggerPattern = { enable, glob, level: logLevel };
			loggerPatterns.push(loggerPattern);
		}
		return loggerPatterns;
	}

	/**
	 * Determine if a log message with the given log level should be filtered out based on the LOGGER environment variable patterns
	 * and the logger's filename.
	 * @param logLevel - Log level of the message
	 * @returns boolean indicating whether the message should be filtered out
	 */
	private shouldBeFiltered(logLevel: LogLevel): boolean {
		// If no LOGGER env variable is set, default to filtering out logs below INFO
		if (this._parsedPatterns.length === 0) {
			const currentLevelRank = Logger.LEVEL_RANK[logLevel];
			const minLevelRank = Logger.LEVEL_RANK[Logger.DEFAULT_LEVEL];
			const shouldBeFiltered = currentLevelRank > minLevelRank;
			return shouldBeFiltered;
		}

		// Walk patterns in order; last matching pattern wins
		let minLevel: LogLevel = Logger.DEFAULT_LEVEL;
		let hasMatched = false;
		let isEnabled = true;
		for (const parsedPattern of this._parsedPatterns) {
			const globMatch: boolean = minimatch(this._filenameWithoutExt, parsedPattern.glob);
			if (globMatch === false) continue;
			hasMatched = true;
			isEnabled = parsedPattern.enable;
			minLevel = parsedPattern.level;
		}

		// if there is filter, and it doesn't match, then filter out
		if (hasMatched === false) return true;
		// if there is filter, and it matches, but it's disabled, then filter out
		if (isEnabled === false) return true;

		// if there is filter, and it matches, and it's enabled, then check log level
		const currentLevelRank = Logger.LEVEL_RANK[logLevel];
		const minLevelRank = Logger.LEVEL_RANK[minLevel];
		const shouldBeFiltered = currentLevelRank > minLevelRank;

		// if log level is below the minimum level specified in the filter, then filter out
		return shouldBeFiltered;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	private log function
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	/**
	 * Core logging method
	 * @param logLevel - Log level
	 * @param msg - Log message
	 * @param meta - Optional metadata object to display
	 */
	private _log(logLevel: LogLevel, msg: string, meta?: Record<string, unknown>): void {
		// // Skip if log level is below minimum threshold
		const shouldBeFiltered = this.shouldBeFiltered(logLevel);
		if (shouldBeFiltered) return;

		// Create a nounce base on this._filenameWithoutExt string
		const nounceFromFilename = this._filenameWithoutExt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
		const colorFns = [
			Chalk.magenta,
			Chalk.blueBright,
			Chalk.green,
			Chalk.yellow,
		];
		const colorFn = colorFns[nounceFromFilename % colorFns.length];

		const timestamp = new Date()
		const colorize = Logger.LEVEL_COLOR[logLevel];
		const fileName15Char = this._filenameWithoutExt.length <= Logger._maxFilenameLength
			? this._filenameWithoutExt
			: '...' + this._filenameWithoutExt.slice(-Logger._maxFilenameLength + 3);
		const parts = [
			// Chalk.dim(timestamp.toISOString()),
			colorize(logLevel.padEnd(5)),
			colorFn(fileName15Char.padEnd(15)),
			msg,
		];

		// Append metadata if provided
		if (meta !== undefined && Object.keys(meta).length > 0) {
			const metaString = Object.entries(meta)
				.map(([key, value]) => `${Chalk.green(key)}=${Chalk.white(typeof value === 'string' ? value : JSON.stringify(value))}`)
				.join(' ');
			parts.push(Chalk.dim('|'), metaString);
		}

		const line = parts.join(' ');
		// Error and warn levels go to stderr, others to stdout
		if (logLevel === 'WARN' || logLevel === 'ERROR' || this._loggerConfig.allToStderr === true) {
			console.error(line);
		} else {
			console.log(line);
		}
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	public logging methods
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	// Public logging methods for each severity level
	debug(msg: string, meta?: Record<string, unknown>): void {
		this._log('DEBUG', msg, meta);
	}
	info(msg: string, meta?: Record<string, unknown>): void {
		this._log('INFO', msg, meta);
	}
	warn(msg: string, meta?: Record<string, unknown>): void {
		this._log('WARN', msg, meta);
	}
	error(msg: string, meta?: Record<string, unknown>): void {
		this._log('ERROR', msg, meta);
	}
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Usage Example
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

async function usageExample() {
	process.env.LOGGER = '**:INFO'; // Enable DEBUG logs for this logger
	console.log(Chalk.blue('--- Logger Usage Example ---'));
	console.log(Chalk.blue('Current LOGGER env variable:'), process.env.LOGGER);

	const logger = Logger.fromMetaUrl(import.meta.url);
	logger.debug('This is a debug message', { user: 'alice', action: 'testDebug' });
	logger.info('This is an info message', { user: 'bob', action: 'testInfo' });
	logger.warn('This is a warning message', { user: 'carol', action: 'testWarn' });
	logger.error('This is an error message', { user: 'dave', action: 'testError' });
}

if (import.meta.main) {
	usageExample().catch(err => {
		console.error('Error in usage example:', err);
	});
}