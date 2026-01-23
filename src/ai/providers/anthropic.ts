import Anthropic from "@anthropic-ai/sdk";
import { z } from "@hono/zod-openapi";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { StructuredToolResponse } from "../types";

export const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-sonnet-20240620";

// --- CLIENT ---
export function createAnthropicClient(env: Env) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY");
  }
  return new Anthropic({
    apiKey: apiKey,
  });
}

// --- HELPERS ---
function toAnthropicMessages(messages: any[]): any[] {
  return messages.map(m => {
      // Anthropic requires specific roles: user/assistant. System is separate.
      // We'll handle system prompt separately in the API call config.
      if (m.role === 'system') return null; // Filtered out, handled in call
      if (m.role === 'tool') {
          return {
              role: 'user',
              content: [
                  {
                      type: 'tool_result',
                      tool_use_id: m.tool_call_id || 'unknown',
                      content: m.content
                  }
              ]
          };
      }
      if (m.role === 'assistant' && m.tool_calls) {
          return {
              role: 'assistant',
              content: m.tool_calls.map((tc: any) => ({
                  type: 'tool_use',
                  id: tc.id,
                  name: tc.name,
                  input: tc.arguments
              }))
          };
      }
      return { role: m.role, content: m.content };
  }).filter(Boolean);
}

function toAnthropicTools(tools: any[]): any[] {
  return tools.map(t => {
      if (t.type === 'function' && t.function) {
          return {
              name: t.function.name,
              description: t.function.description,
              input_schema: cleanSchema(t.function.parameters)
          };
      }
      return {
          name: t.name,
          description: t.description,
          input_schema: cleanSchema(t.parameters) // Helper needed if standard schema
      };
  });
}

function cleanSchema(schema: any) {
    // Similar to Gemini clean params, ensure JSON schema is compatible
    const s = JSON.parse(JSON.stringify(schema));
    delete s.$schema;
    delete s.additionalProperties;
    return s;
}

// --- API ---

export async function generateText(
  env: Env,
  prompt: string,
  systemPrompt?: string,
  model?: string
): Promise<string> {
  const client = createAnthropicClient(env);
  const m = model || DEFAULT_ANTHROPIC_MODEL;

  try {
    const response = await client.messages.create({
      model: m,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }]
    });

    // Content is array of ContentBlock
    const textBlock = response.content.find(c => c.type === 'text');
    return textBlock?.text || "";

  } catch (error) {
    console.error("Anthropic Query Error:", error);
    throw error;
  }
}

export async function generateWithTools(
  env: Env,
  messages: any[],
  tools: any[],
  model?: string
): Promise<{ content: string | null; tool_calls: any[] }> {
    const client = createAnthropicClient(env);
    const m = model || DEFAULT_ANTHROPIC_MODEL;
    
    // Extract system prompt if present in messages as first item
    let systemPrompt = undefined;
    if (messages.length > 0 && messages[0].role === 'system') {
        systemPrompt = messages[0].content;
    }

    const anthropicMessages = toAnthropicMessages(messages);
    const anthropicTools = toAnthropicTools(tools);

    try {
        const response = await client.messages.create({
            model: m,
            max_tokens: 4096,
            system: systemPrompt,
            messages: anthropicMessages,
            tools: anthropicTools,
        });

        let content = "";
        const tool_calls: any[] = [];

        for (const block of response.content) {
            if (block.type === 'text') {
                content += block.text;
            } else if (block.type === 'tool_use') {
                tool_calls.push({
                    id: block.id,
                    name: block.name,
                    arguments: block.input
                });
            }
        }

        return { content: content || null, tool_calls };

    } catch (error) {
        console.error("Anthropic Tool Gen Error:", error);
        throw error;
    }
}
