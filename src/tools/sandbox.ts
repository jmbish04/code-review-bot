import { getSandbox } from '@cloudflare/sandbox';

export class SandboxTools {
    private sandbox: any;

    constructor(private env: any) {
        this.sandbox = getSandbox(env.Sandbox, 'default-sandbox');
    }

    async execute(command: string) {
        console.log(`[Sandbox] Executing: ${command}`);
        const result = await this.sandbox.exec(command);
        console.log(`[Sandbox] Result:`, result);
        return result;
    }

    async writeFile(path: string, content: string) {
        await this.sandbox.writeFile(path, content);
    }
    
    // async cloneRepo(repoUrl: string) ...
}
