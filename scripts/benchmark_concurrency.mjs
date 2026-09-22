
async function runBenchmark() {
    const queries = ["Query 1", "Query 2", "Query 3"];

    // Mock delays
    const DELAY_CACHE = 10;
    const DELAY_AI = 100;
    const DELAY_DB = 50;

    const mockDb = {
        insert: () => ({ values: () => new Promise(resolve => setTimeout(resolve, DELAY_DB)) })
    };

    const mockBot = {
        checkCache: async (query) => {
            await new Promise(resolve => setTimeout(resolve, DELAY_CACHE));
            return null; // Simulate miss
        },
        generateText: async (prompt) => {
            await new Promise(resolve => setTimeout(resolve, DELAY_AI));
            return "Mock Response";
        },
        db: mockDb,
        model: "gpt-mock"
    };

    console.log("Starting Benchmark...");

    // 1. Sequential (Baseline)
    console.log("\n--- Sequential Execution (Baseline) ---");
    const startSeq = performance.now();
    let contextSeq = "";

    for (const query of queries) {
        const cached = await mockBot.checkCache(query);
        if (cached) {
            contextSeq += `\n\nContext for "${query}" (Cached):\n${cached}`;
            continue;
        }

        const docsResponse = await mockBot.generateText(
            `Answer this question specifically about Cloudflare Workers best practices: ${query}`
        );

        await mockBot.db.insert().values({
            query,
            response: docsResponse,
            provider: mockBot.model,
            createdAt: new Date()
        });

        contextSeq += `\n\nContext for "${query}":\n${docsResponse}`;
    }

    const endSeq = performance.now();
    const timeSeq = endSeq - startSeq;
    console.log(`Sequential Time: ${timeSeq.toFixed(2)}ms`);


    // 2. Parallel (Optimized)
    console.log("\n--- Parallel Execution (Optimized) ---");
    const startPar = performance.now();

    const results = await Promise.all(queries.map(async (query) => {
        const cached = await mockBot.checkCache(query);
        if (cached) {
            return `\n\nContext for "${query}" (Cached):\n${cached}`;
        }

        const docsResponse = await mockBot.generateText(
            `Answer this question specifically about Cloudflare Workers best practices: ${query}`
        );

        await mockBot.db.insert().values({
            query,
            response: docsResponse,
            provider: mockBot.model,
            createdAt: new Date()
        });

        return `\n\nContext for "${query}":\n${docsResponse}`;
    }));

    let contextPar = "";
    contextPar += results.join("");

    const endPar = performance.now();
    const timePar = endPar - startPar;
    console.log(`Parallel Time: ${timePar.toFixed(2)}ms`);

    // Conclusion
    const improvement = timeSeq / timePar;
    console.log(`\nSpeedup: ${improvement.toFixed(2)}x`);
}

runBenchmark();
