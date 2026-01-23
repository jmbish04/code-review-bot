
import fs from 'node:fs';
import path from 'node:path';

const WORKER_PATH = path.resolve('./dist/_worker.js/index.js');

const POLYFILL_CODE = `
// --- Polyfill MessageChannel for React 19 ---
if (typeof globalThis.MessageChannel === 'undefined') {
    globalThis.MessageChannel = class MessageChannel {
        constructor() {
            this.port1 = { onmessage: null, postMessage: (msg) => { if (this.port2.onmessage) this.port2.onmessage({ data: msg }); } };
            this.port2 = { onmessage: null, postMessage: (msg) => { if (this.port1.onmessage) this.port1.onmessage({ data: msg }); } };
        }
    };
}
// --- End Polyfill ---
`;

const SANDBOX_CODE = `
// --- Sandbox Durable Object ---
import { DurableObject } from "cloudflare:workers";
class Sandbox extends DurableObject {
    constructor(ctx, env) {
        super(ctx, env);
    }
    async fetch(request) {
        return new Response("Sandbox DO Alive");
    }
}
export { Sandbox };
// --- End Sandbox ---
`;

try {
    let content = fs.readFileSync(WORKER_PATH, 'utf8');
    
    // Inject Polyfill at the top
    content = POLYFILL_CODE + content;
    
    // Inject Sandbox export at the bottom
    // We need to ensure we don't break the existing export
    // The existing file ends with: export { __astrojsSsrVirtualEntry as default, pageMap };
    // We want to add Sandbox to that export list OR just perform a named export.
    // Since 'export { Sandbox }' is a named export, it can coexist with the existing export statement.
    content += SANDBOX_CODE;

    fs.writeFileSync(WORKER_PATH, content);
    console.log('✅ Successfully augmented _worker.js with Polyfill and Sandbox');
} catch (e) {
    console.error('❌ Failed to augment _worker.js:', e);
    process.exit(1);
}
