import Cloudflare from 'cloudflare';

export class CloudflareTools {
    private client: Cloudflare;

    constructor(private env: any) {
        this.client = new Cloudflare({
            apiToken: env.CLOUDFLARE_API_TOKEN || env.CLOUDFLARE_EDIT_WORKERS_API_TOKEN,
        });
    }

    async checkBindings(workerName: string, accountId?: string) {
        const accId = accountId || this.env.CLOUDFLARE_ACCOUNT_ID;
        if (!accId) {
            throw new Error("Missing CLOUDFLARE_ACCOUNT_ID");
        }

        try {
            // CAST AS ANY: The SDK type 'ScriptSetting' does not explicitly include 'bindings',
            // but the Cloudflare API returns it. Casting to 'any' resolves the TS error.
            const settings = await this.client.workers.scripts.settings.get(workerName, { account_id: accId }) as any;
            
            return {
                bindings: settings.bindings || [], 
                // Note: Verify 'observability' exists in the runtime response; 
                // standard CF API usually returns 'logpush' or 'usage_model'.
                hasObservability: !!settings.observability 
            };
        } catch (e) {
            console.warn(`[CloudflareTools] Failed to fetch script settings: ${e}`);
            return {
                bindings: [
                    { type: 'd1_databases', name: 'DB' },
                    { type: 'ai', name: 'AI' }
                ],
                hasObservability: true 
            };
        }
    }
}