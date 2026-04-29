export type HealthOptions = {
        baseUrl: string;
};

export type HealthResponse = {
        status: string;
        model_loaded: boolean;
        model_downloaded?: boolean | null;
        model_size?: string | null;
        gpu_available: boolean;
        vram_used_mb?: number | null;
};

export class CommandHealth {
        static async run(options: HealthOptions): Promise<void> {
                const url = `${options.baseUrl.replace(/\/+$/, '')}/health`;

                const response = await fetch(url);
                if (response.ok === false) {
                        throw new Error(`Health request failed: ${response.status} ${response.statusText}`);
                }

                const data = await response.json() as HealthResponse;
                console.log(JSON.stringify(data, null, 2));
        }
}
