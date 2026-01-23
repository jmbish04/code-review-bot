// type import removed, Env is global or available in worker-configuration
import * as providers from "./providers";
import { z } from "@hono/zod-openapi";
import type { 
    VisionInput, 
    StructuredToolResponse,
    AIModelOptions,
    GenerateTextOptions,
    GenerateStructuredOptions,
    GenerateVisionOptions
} from "./types";

export * from "./providers";
export * from "./types";
export * from "./utils/index";

export function getProviderFromModel(model: string) {
  if (model.startsWith("claude")) return "anthropic";
  if (model.startsWith("gemini")) return "google-genai";
  if (model.startsWith("gpt")) return "openai";
  if (model.startsWith("@cf")) return "workers-ai";
  return "workers-ai"; 
}

// --- UNIFIED FUNCTIONS ---

export async function generateText(
  env: Env,
  prompt: string,
  systemPrompt?: string,
  model?: string
): Promise<string> {
  const m = model || "gemini-2.0-flash";
  const provider = getProviderFromModel(m);

  switch (provider) {
    case "anthropic":
      return providers.Anthropic.generateText(env, prompt, systemPrompt, m);
    case "google-genai":
      return providers.Gemini.generateText(env, prompt, systemPrompt, m);
    case "openai":
      return providers.OpenAI.generateText(env, prompt, systemPrompt, m);
    case "workers-ai":
    default:
       // WorkerAI generateText signature matches (env, prompt, system, model) roughly but verify legacy args
       // Legacy: (env, prompt, system, model, options)
      return providers.WorkerAI.generateText(env, prompt, systemPrompt, m, {});
  }
}

export async function generateStructured<T = any>(
  env: Env,
  prompt: string,
  schema: z.ZodType<T> | object,
  options: GenerateStructuredOptions = {}
): Promise<T> {
  const m = options.model || "gemini-2.0-flash";
  const provider = options.provider || getProviderFromModel(m);
  const system = options.system;

  switch (provider) {
    case "anthropic":
        throw new Error("generateStructured not implemented for Anthropic");
    case "google-genai": // "gemini" in previous code, mapped to google-genai in getProviderFromModel?
    // Wait, getProviderFromModel returns "google-genai". Previous code used "gemini".
    // I should align strings.
    // The previous code had a switch case "gemini".
    // I will support both for safety.
    case "gemini":
      return providers.Gemini.generateStructured(env, prompt, schema, system, {
        modelName: m
      });
    case "openai":
      return providers.OpenAI.generateStructured(env, prompt, schema, system, {
        modelName: m
      });
    case "workers-ai":
    default:
      return providers.WorkerAI.generateStructured(env, prompt, schema, system, {
        reasoningEffort: options.reasoningEffort,
        modelName: m
      });
  }
}

export async function generateEmbeddings(
  env: Env,
  text: string,
  options: AIModelOptions = {}
): Promise<number[]> {
  const m = options.model;
  const provider = options.provider || (m ? getProviderFromModel(m) : "workers-ai");

  switch (provider) {
    case "anthropic":
        throw new Error("generateEmbeddings not implemented for Anthropic");
    case "gemini":
    case "google-genai":
      return providers.Gemini.generateEmbeddings(env, text, {
        model: m,
        outputDimensionality: options.outputDimensionality
      });
    case "openai":
      return providers.OpenAI.generateEmbeddings(env, text, { model: m });
    case "workers-ai":
    default:
      return providers.WorkerAI.generateEmbeddings(env, text, { model: m });
  }
}

export async function generateVision(
  env: Env,
  image: VisionInput,
  prompt: string,
  options: GenerateVisionOptions = {}
): Promise<string> {
  const m = options.model;
  const provider = options.provider || (m ? getProviderFromModel(m) : "workers-ai");

  switch (provider) {
    case "anthropic":
        throw new Error("generateVision not implemented for Anthropic");
    case "gemini":
    case "google-genai":
      return providers.Gemini.generateVision(env, image, prompt, { modelName: m });
    case "openai":
      return providers.OpenAI.generateVision(env, image, prompt, { modelName: m });
    case "workers-ai":
    default:
      return providers.WorkerAI.generateVision(env, image, prompt, { modelName: m });
  }
}

export async function generateVisionStructured<T>(
  env: Env,
  image: VisionInput,
  prompt: string,
  schema: z.ZodType<T>,
  options: GenerateVisionOptions = {}
): Promise<T> {
  const m = options.model;
  const provider = options.provider || (m ? getProviderFromModel(m) : "workers-ai");

  switch (provider) {
     case "anthropic":
        throw new Error("generateVisionStructured not implemented for Anthropic");
    case "gemini":
    case "google-genai":
      return providers.Gemini.generateVisionStructured(env, image, prompt, schema, {
        modelName: m
      });
    case "openai":
      return providers.OpenAI.generateVisionStructured(env, image, prompt, schema, {
        modelName: m
      });
    case "workers-ai":
    default:
      return providers.WorkerAI.generateVisionStructured(env, image, prompt, schema, {
        modelName: m
      });
  }
}

export async function generateWithTools(
  env: Env,
  messages: any[],
  tools: any[],
  options: AIModelOptions = {}
): Promise<{ content: string | null; tool_calls: any[] }> {
    const m = options.model;
    const provider = options.provider || (m ? getProviderFromModel(m) : "workers-ai");

  switch (provider) {
    case "anthropic":
      return providers.Anthropic.generateWithTools(env, messages, tools, m);
    case "gemini":
    case "google-genai":
      return providers.Gemini.generateWithTools(env, messages, tools, m);
    case "openai":
      return providers.OpenAI.generateWithTools(env, messages, tools, m);
    case "workers-ai":
    default:
      return providers.WorkerAI.generateWithTools(env, messages, tools, m);
  }
}

export async function generateStructuredWithTools<T>(
  env: Env,
  messages: any[],
  tools: any[],
  schema: z.ZodType<T>,
  options: AIModelOptions = {}
): Promise<StructuredToolResponse<T>> {
  const m = options.model;
  const provider = options.provider || (m ? getProviderFromModel(m) : "workers-ai");

  switch (provider) {
    case "anthropic":
        throw new Error("generateStructuredWithTools not implemented for Anthropic");
    case "gemini":
    case "google-genai":
      return providers.Gemini.generateStructuredWithTools(
        env,
        messages,
        tools,
        schema,
        m
      );
    case "openai":
      return providers.OpenAI.generateStructuredWithTools(
        env,
        messages,
        tools,
        schema,
        m
      );
    case "workers-ai":
    default:
      return providers.WorkerAI.generateStructuredWithTools(
        env,
        messages,
        tools,
        schema,
        m
      );
  }
}
