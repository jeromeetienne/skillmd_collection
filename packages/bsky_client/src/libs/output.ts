// npm imports
import Chalk from 'chalk';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Output Helper
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

export interface OutputHelper {
	isJson: boolean;
	result(data: unknown): void;
	progress(message: string): void;
}

export function createOutput(jsonMode: boolean): OutputHelper {
	return {
		isJson: jsonMode,
		result(data: unknown): void {
			if (jsonMode) process.stdout.write(JSON.stringify(data, null, 2) + '\n');
		},
		progress(message: string): void {
			if (jsonMode === false) console.log(Chalk.dim(message));
		},
	};
}
