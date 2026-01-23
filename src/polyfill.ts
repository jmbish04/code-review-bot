// Polyfill MessageChannel for React 19 compatibility
if (typeof globalThis.MessageChannel === 'undefined') {
	// @ts-ignore
	globalThis.MessageChannel = class MessageChannel {
		port1: any;
		port2: any;
		constructor() {
			this.port1 = { onmessage: null, postMessage: (msg: any) => { if (this.port2.onmessage) this.port2.onmessage({ data: msg }); } };
			this.port2 = { onmessage: null, postMessage: (msg: any) => { if (this.port1.onmessage) this.port1.onmessage({ data: msg }); } };
		}
	};
}
