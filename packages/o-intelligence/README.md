# o-intelligence

Multi-provider AI intelligence router for Olane OS that provides a unified interface to interact with LLM providers including Anthropic, OpenAI, Ollama, Perplexity, and Grok.

## Quick Start

```bash
# Installation
pnpm install @olane/o-intelligence
```

```typescript
// Basic usage with automatic provider selection
import { IntelligenceTool } from '@olane/o-intelligence';
import { oAddress } from '@olane/o-core';

const intelligence = new IntelligenceTool({
  address: new oAddress('o://intelligence')
});

await intelligence.start();

// Send a prompt (automatically routes to configured provider)
const response = await intelligence.use(new oAddress('o://intelligence'), {
  method: 'prompt',
  params: {
    prompt: 'Explain quantum computing in simple terms'
  }
});

console.log(response.result.data);
```

## How It Works {#how-it-works}

`o-intelligence` is a **complex node** that acts as a smart router for LLM requests. It:

1. **Manages multiple AI providers** as child nodes (Anthropic, OpenAI, Ollama, Perplexity, Grok)
2. **Handles provider selection** via configuration, environment variables, or interactive prompts
3. **Securely stores API keys** using `o://secure` for credential management
4. **Routes requests** to the appropriate provider based on configuration
5. **Provides unified interface** - one API for all providers

```
┌─────────────────────────────────────────────────┐
│  o://intelligence (Router/Coordinator)          │
│  • Manages provider selection                   │
│  • Handles API key retrieval                    │
│  • Routes requests to child nodes               │
└─────────────────────────────────────────────────┘
                    ⬇ routes to
    ┌───────────┬───────────┬───────────┬────────────┬──────────┐
    ⬇           ⬇           ⬇           ⬇            ⬇          ⬇
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────┐ ┌────────┐
│anthropic│ │ openai  │ │ ollama  │ │perplexity│ │ grok │ │ gemini │
└─────────┘ └─────────┘ └─────────┘ └──────────┘ └──────┘ └────────┘
```

## Tools {#tools}

### Router Tools (o://intelligence)

#### `prompt` - Simple AI Prompting

Send a single prompt and get a response. The router automatically selects the configured provider.

**Parameters:**
- `prompt` (string, required): The prompt to send to the AI model

**Returns:** LLM response with message text

**Example:**
```typescript
const result = await intelligence.use(new oAddress('o://intelligence'), {
  method: 'prompt',
  params: {
    prompt: 'Write a haiku about coding'
  }
});

console.log(result.result.data.message);
// Outputs the generated haiku
```

#### `configure` - Set Provider Preferences

Configure which AI provider to use and store preferences securely.

**Parameters:**
- `modelProvider` (string, optional): Provider to use (`anthropic`, `openai`, `ollama`, `perplexity`, `grok`, `gemini`)
- `hostingProvider` (string, optional): Where models are hosted (`olane`, `local`)
- `accessToken` (string, optional): Access token for hosted models
- `address` (string, optional): Custom address for hosted models

**Returns:** Success confirmation

**Example:**
```typescript
await intelligence.use(new oAddress('o://intelligence'), {
  method: 'configure',
  params: {
    modelProvider: 'anthropic',
    hostingProvider: 'local'
  }
});
```

### Provider Tools (Child Nodes)

Each provider node (`o://anthropic`, `o://openai`, etc.) exposes these tools:

#### `completion` - Multi-Turn Conversation

Generate responses with conversation history. This is the primary method for interacting with provider nodes.

**Parameters (from `LLM_PARAMS`):**
- `model` (string, optional): Specific model to use (defaults to provider's default model)
- `messages` (array, required): Conversation history
  - `role` (string): `user` or `assistant`
  - `content` (string | array): Message content
- `options` (object, optional): Provider-specific generation options (e.g., `temperature`, `max_tokens`, `top_p`, `system`). See note on two-tier architecture below.
- `stream` (boolean, optional): Whether to stream the response

> **Note**: Parameters like `system`, `max_tokens`, `temperature`, `apiKey` are not defined in the `LLM_PARAMS` method definition. However, providers destructure additional parameters from `request.params` at runtime. Pass provider-specific options via the `options` object or as top-level params depending on the provider. See [Two-Tier Architecture](#two-tier-architecture) for details.

**Returns:** Response with message, model info, and token usage

**Example:**
```typescript
const response = await intelligence.use(new oAddress('o://anthropic'), {
  method: 'completion',
  params: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    messages: [
      { role: 'user', content: 'What is TypeScript?' },
      { role: 'assistant', content: 'TypeScript is a typed superset of JavaScript...' },
      { role: 'user', content: 'Can you give me an example?' }
    ],
    system: 'You are a helpful programming tutor',
    max_tokens: 500
  }
});

console.log(response.result.data);
// {
//   message: 'Here\'s a TypeScript example...',
//   model: 'claude-sonnet-4-5-20250929',
//   usage: { input_tokens: 45, output_tokens: 120 }
// }
```

#### `generate` - Simple Text Generation

Generate text from a single prompt (simpler than completion).

**Parameters (from `LLM_PARAMS`):**
- `model` (string, required): The model to use for generation
- `stream` (boolean, optional): Whether to stream the response

> **Note**: The `LLM_PARAMS` method definition only specifies `model` and `stream`. However, provider implementations accept additional runtime parameters like `prompt`, `system`, `max_tokens`, and `apiKey` via `request.params`. See [Two-Tier Architecture](#two-tier-architecture) for details.

**Returns:** Generated text response

**Example:**
```typescript
const result = await intelligence.use(new oAddress('o://openai'), {
  method: 'generate',
  params: {
    apiKey: process.env.OPENAI_API_KEY,
    prompt: 'Explain REST APIs in one paragraph',
    model: 'gpt-4-turbo-preview',
    max_tokens: 200
  }
});
```

#### `list_models` - List Available Models

Get a list of all available models from the provider.

**Parameters:**
- `apiKey` (string, optional): Override API key

**Returns:** Array of model objects with details

**Example:**
```typescript
const models = await intelligence.use(new oAddress('o://anthropic'), {
  method: 'list_models',
  params: {
    apiKey: process.env.ANTHROPIC_API_KEY
  }
});

console.log(models.result.data.models);
// [
//   { id: 'claude-sonnet-4-5-20250929', name: 'Claude 3.5 Sonnet', ... },
//   { id: 'claude-opus-3-20240229', name: 'Claude 3 Opus', ... }
// ]
```

#### `model_info` - Get Model Details

Retrieve detailed information about a specific model.

**Parameters:**
- `model` (string, optional): Model ID (defaults to provider default)
- `apiKey` (string, optional): Override API key

**Returns:** Model details including context length, pricing, description

**Example:**
```typescript
const info = await intelligence.use(new oAddress('o://anthropic'), {
  method: 'model_info',
  params: {
    model: 'claude-sonnet-4-5-20250929',
    apiKey: process.env.ANTHROPIC_API_KEY
  }
});

console.log(info.result.data.model);
// {
//   id: 'claude-sonnet-4-5-20250929',
//   display_name: 'Claude 3.5 Sonnet',
//   context_length: 200000,
//   pricing: { prompt: '$3/MTok', completion: '$15/MTok' }
// }
```

#### `status` - Check Provider Health

Verify that the provider API is accessible and working.

**Parameters:**
- `apiKey` (string, optional): Override API key

**Returns:** Status information

**Example:**
```typescript
const status = await intelligence.use(new oAddress('o://anthropic'), {
  method: 'status',
  params: {
    apiKey: process.env.ANTHROPIC_API_KEY
  }
});

console.log(status.result.data);
// { success: true, status: 'ok', response: 'Anthropic API is accessible' }
```

#### `pull_model` - Pull Model (Ollama)

Download a model from the Ollama library to the local machine.

**Parameters:**
- `model` (string, required): The model name to pull (e.g., `llama2`, `codellama`)
- `insecure` (boolean, optional): Whether to allow insecure connections

**Returns:** Success confirmation with pull details

**Example:**
```typescript
const result = await intelligence.use(new oAddress('o://ollama'), {
  method: 'pull_model',
  params: {
    model: 'llama3.2:latest'
  }
});

console.log(result.result.data);
// { success: true, message: 'Model llama3.2:latest pulled successfully', details: '...' }
```

> **Note**: This method is only available on the Ollama provider (`o://ollama`).

---

#### `delete_model` - Delete Model (Ollama)

Remove a model from the local Ollama installation.

**Parameters:**
- `model` (string, required): The model name to delete

**Returns:** Success confirmation

**Example:**
```typescript
const result = await intelligence.use(new oAddress('o://ollama'), {
  method: 'delete_model',
  params: {
    model: 'llama2'
  }
});

console.log(result.result.data);
// { success: true, message: 'Model llama2 deleted successfully' }
```

> **Note**: This method is only available on the Ollama provider (`o://ollama`).

---

#### `embed_documents` - Generate Document Embeddings

Generate vector embeddings for multiple text documents. Useful for semantic search and RAG applications.

**Parameters:**
- `input` (array, required): Array of text strings to embed
- `model` (string, optional): The embedding model to use
- `apiKey` (string, optional): API key (falls back to environment variable)
- `dimensions` (number, optional): Number of embedding dimensions (only for text-embedding-3 models)

**Returns:** Array of embedding vectors

**Example:**
```typescript
const result = await intelligence.use(new oAddress('o://openai'), {
  method: 'embed_documents',
  params: {
    input: ['First document text', 'Second document text'],
    model: 'text-embedding-3-small',
    apiKey: process.env.OPENAI_API_KEY
  }
});

console.log(result.result.data);
```

> **Note**: Available on providers that support embeddings (OpenAI, Gemini, Ollama).

---

#### `embed_query` - Generate Query Embedding

Generate a vector embedding for a single query string. Optimized for search queries.

**Parameters:**
- `input` (string, required): Text string to embed
- `model` (string, optional): The embedding model to use
- `apiKey` (string, optional): API key (falls back to environment variable)
- `dimensions` (number, optional): Number of embedding dimensions (only for text-embedding-3 models)

**Returns:** Embedding vector

**Example:**
```typescript
const result = await intelligence.use(new oAddress('o://openai'), {
  method: 'embed_query',
  params: {
    input: 'What is machine learning?',
    model: 'text-embedding-3-small',
    apiKey: process.env.OPENAI_API_KEY
  }
});

console.log(result.result.data);
```

> **Note**: Available on providers that support embeddings (OpenAI, Gemini, Ollama).

---

#### `generate_image` - Generate Images (Gemini)

Generate images from text prompts using Gemini image models.

**Parameters:**
- `prompt` (string, required): Text description of the desired image
- `model` (string, optional): Model to use (`gemini-2.5-flash-image` (default) or `gemini-3-pro-image-preview`)
- `aspectRatio` (string, optional): Aspect ratio (e.g., `1:1`, `16:9`, `9:16`). Default: `1:1`
- `imageSize` (string, optional): Size (`1K`, `2K` (default), `4K`)
- `negativePrompt` (string, optional): Description of what to avoid in the image

**Returns:** Generated image data

**Example:**
```typescript
const result = await intelligence.use(new oAddress('o://gemini'), {
  method: 'generate_image',
  params: {
    prompt: 'A serene mountain landscape at sunset',
    aspectRatio: '16:9',
    imageSize: '2K'
  }
});

console.log(result.result.data);
```

> **Note**: This method is only available on the Gemini provider (`o://gemini`).

---

#### `edit_image` - Edit Images (Gemini)

Edit or transform an existing image using Gemini image models.

**Parameters:**
- `prompt` (string, required): Instructions for how to edit the image
- `image` (string, required): Base64-encoded image data or file path (JPEG, PNG)
- `model` (string, optional): Model to use (`gemini-2.5-flash-image` (default) or `gemini-3-pro-image-preview`)
- `aspectRatio` (string, optional): Aspect ratio for the edited image
- `imageSize` (string, optional): Size of the edited image (`1K`, `2K` (default), `4K`)

**Returns:** Edited image data

**Example:**
```typescript
const result = await intelligence.use(new oAddress('o://gemini'), {
  method: 'edit_image',
  params: {
    prompt: 'Remove the background and replace with a white backdrop',
    image: '/path/to/image.png',
    imageSize: '2K'
  }
});

console.log(result.result.data);
```

> **Note**: This method is only available on the Gemini provider (`o://gemini`).

---

## Two-Tier Architecture {#two-tier-architecture}

`o-intelligence` uses a two-tier method parameter architecture:

### `INTELLIGENCE_PARAMS` (Router Level)

Defined in `intelligence.methods.ts`, these are the methods exposed by the `o://intelligence` router node:
- `configure` - Set provider preferences (`modelProvider`, `hostingProvider`)
- `prompt` - Simple AI prompting (`prompt`, `userMessage`, `stream`)

These are high-level orchestration methods that handle provider selection and routing.

### `LLM_PARAMS` (Provider Level)

Defined in `llm.methods.ts`, these are the methods exposed by each provider child node (`o://anthropic`, `o://openai`, etc.):
- `completion` - Multi-turn conversation (`model`, `messages`, `options`, `stream`)
- `generate` - Simple text generation (`model`, `stream`)
- `list_models` - List available models
- `pull_model` - Pull model (Ollama-specific)
- `delete_model` - Delete model (Ollama-specific)
- `model_info` - Get model details (`model`)
- `status` - Check provider health
- `embed_documents` - Generate document embeddings
- `embed_query` - Generate query embedding
- `generate_image` - Generate images (Gemini-specific)
- `edit_image` - Edit images (Gemini-specific)

**Important**: The `LLM_PARAMS` definitions specify the formal parameter schema for AI discovery. However, individual provider implementations accept additional runtime parameters (like `apiKey`, `system`, `max_tokens`, `temperature`) that are destructured directly from `request.params`. This means you can pass these extra parameters when calling providers, even though they are not declared in the method schema.

## Response Structure {#response-structure}

When calling provider methods via `node.use()`, responses follow the standard Olane response pattern:

```typescript
const response = await intelligence.use(new oAddress('o://anthropic'), {
  method: 'completion',
  params: { messages: [...], model: 'claude-sonnet-4-5-20250929' }
});

// Always check success first
if (response.result.success) {
  const data = response.result.data;
  console.log(data.message);  // The generated text
  console.log(data.model);    // Model used
  console.log(data.usage);    // Token usage info
} else {
  console.error(response.result.error);  // Error message string
}

// Full response shape:
// {
//   jsonrpc: "2.0",
//   id: "request-id",
//   result: {
//     success: boolean,
//     data: any,          // Present on success
//     error?: string      // Present on failure
//   }
// }
```

## Configuration {#configuration}

### Environment Variables

Set provider API keys via environment variables (highest priority):

```bash
# Provider API Keys
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
export GEMINI_API_KEY="..."
export GROK_API_KEY="..."
export SONAR_API_KEY="..."  # Perplexity

# Provider Selection
export MODEL_PROVIDER_CHOICE="anthropic"  # anthropic, openai, ollama, perplexity, grok, gemini
```

### Secure Storage

If API keys aren't in environment variables, `o-intelligence` will:
1. Check `o://secure` storage for saved keys
2. Prompt the user interactively if not found
3. Save the key to secure storage for future use

**Stored keys:**
- `anthropic-api-key`
- `openai-api-key`
- `ollama-api-key`
- `perplexity-api-key`
- `grok-api-key`
- `gemini-api-key`
- `model-provider-preference`

### Interactive Configuration

If no configuration is found, users will be prompted:

```bash
# Terminal output when no provider is configured:
? Which AI model do you want to use? (anthropic, openai, ollama, perplexity, grok, gemini)
> anthropic

? What is the API key for the anthropic model?
> sk-ant-...

# Saved to secure storage for future use
```

## Common Use Cases {#common-use-cases}

### Use Case 1: Simple Chatbot

Build a conversational AI that maintains context.

```typescript
import { IntelligenceTool } from '@olane/o-intelligence';
import { oAddress } from '@olane/o-core';

const intelligence = new IntelligenceTool({
  address: new oAddress('o://intelligence')
});

await intelligence.start();

const conversationHistory = [];

async function chat(userMessage: string) {
  // Add user message to history
  conversationHistory.push({
    role: 'user',
    content: userMessage
  });

  // Get AI response
  const response = await intelligence.use(new oAddress('o://anthropic'), {
    method: 'completion',
    params: {
      messages: conversationHistory,
      system: 'You are a helpful assistant',
      max_tokens: 1000
    }
  });

  const aiMessage = response.result.data.message;

  // Add AI response to history
  conversationHistory.push({
    role: 'assistant',
    content: aiMessage
  });

  return aiMessage;
}

// Example conversation
await chat('Hello! What can you help me with?');
await chat('Can you explain async/await in JavaScript?');
await chat('Can you give me an example?');
```

### Use Case 2: Multi-Provider Fallback

Try multiple providers with fallback logic.

```typescript
import { IntelligenceTool } from '@olane/o-intelligence';
import { oAddress } from '@olane/o-core';

const intelligence = new IntelligenceTool({
  address: new oAddress('o://intelligence')
});

await intelligence.start();

async function generateWithFallback(prompt: string) {
  const providers = [
    { address: 'o://anthropic', key: process.env.ANTHROPIC_API_KEY },
    { address: 'o://openai', key: process.env.OPENAI_API_KEY },
    { address: 'o://grok', key: process.env.GROK_API_KEY }
  ];

  for (const provider of providers) {
    try {
      const response = await intelligence.use(new oAddress(provider.address), {
        method: 'generate',
        params: {
          apiKey: provider.key,
          prompt: prompt
        }
      });

      if (response.result.success) {
        return response.result.data;
      }
    } catch (error) {
      console.warn(`${provider.address} failed, trying next provider...`);
      continue;
    }
  }

  throw new Error('All providers failed');
}

const result = await generateWithFallback('Explain machine learning');
```

### Use Case 3: Local Model with Ollama

Run AI models locally using Ollama (no API key required).

```typescript
import { IntelligenceTool } from '@olane/o-intelligence';
import { oAddress } from '@olane/o-core';

// Configure to use Ollama (local)
await intelligence.use(new oAddress('o://intelligence'), {
  method: 'configure',
  params: {
    modelProvider: 'ollama',
    hostingProvider: 'local'
  }
});

// Use local model
const response = await intelligence.use(new oAddress('o://intelligence'), {
  method: 'prompt',
  params: {
    prompt: 'What is the capital of France?'
  }
});

// Runs on local Ollama instance (typically http://localhost:11434)
```

### Use Case 4: Model Comparison

Compare responses from different providers.

```typescript
async function compareProviders(prompt: string) {
  const providers = ['anthropic', 'openai', 'grok'];
  const results = [];

  for (const provider of providers) {
    const response = await intelligence.use(new oAddress(`o://${provider}`), {
      method: 'generate',
      params: {
        prompt: prompt,
        max_tokens: 200
      }
    });

    results.push({
      provider: provider,
      response: response.result.data.response,
      model: response.result.data.model,
      tokens: response.result.data.usage
    });
  }

  return results;
}

const comparison = await compareProviders('Explain blockchain in simple terms');
comparison.forEach(r => {
  console.log(`\n${r.provider} (${r.model}):`);
  console.log(r.response);
  console.log(`Tokens: ${JSON.stringify(r.tokens)}`);
});
```

### Use Case 5: Streaming Responses (Advanced)

Handle long-form generation with streaming.

```typescript
// Note: Streaming support varies by provider
// This example shows the pattern for providers that support it

async function streamGeneration(prompt: string) {
  // Check provider capabilities first
  const status = await intelligence.use(new oAddress('o://anthropic'), {
    method: 'status',
    params: {}
  });

  if (status.result.data.status !== 'ok') {
    throw new Error('Provider not available');
  }

  // Generate with streaming (if supported)
  const response = await intelligence.use(new oAddress('o://anthropic'), {
    method: 'completion',
    params: {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      stream: true  // Enable streaming if provider supports it
    }
  });

  return response;
}
```

## API Reference {#api-reference}

### IntelligenceTool Class

Main router class that extends `oLaneTool`.

```typescript
class IntelligenceTool extends oLaneTool
```

**Constructor:**
```typescript
constructor(config: oNodeToolConfig)
```

**Config Options:**
- `address`: oAddress for the intelligence router (typically `o://intelligence`)
- `description`: Optional description override
- All standard `oNodeToolConfig` options

**Methods:**

#### `getModelProvider()`

Determines which AI provider to use.

**Priority:**
1. `MODEL_PROVIDER_CHOICE` environment variable
2. Stored preference in `o://secure`
3. Interactive user prompt

**Returns:** `Promise<{ provider: LLMProviders }>`

#### `getProviderApiKey(provider: LLMProviders)`

Retrieves API key for the specified provider.

**Priority:**
1. Environment variable (e.g., `ANTHROPIC_API_KEY`)
2. Stored key in `o://secure`
3. Interactive user prompt

**Returns:** `Promise<{ apiKey: string }>`

#### `chooseIntelligence(request: PromptRequest)`

Selects the appropriate intelligence provider and retrieves API key.

**Returns:** `Promise<{ choice: oAddress, apiKey: string, options: any }>`

### Provider Classes

Each provider (Anthropic, OpenAI, Ollama, Perplexity, Grok) extends `oLaneTool`:

```typescript
class AnthropicIntelligenceTool extends oLaneTool
class OpenAIIntelligenceTool extends oLaneTool
class OllamaIntelligenceTool extends oLaneTool
class PerplexityIntelligenceTool extends oLaneTool
class GrokIntelligenceTool extends oLaneTool
class GeminiIntelligenceTool extends oLaneTool
```

**Default Models:**
- Anthropic: `claude-sonnet-4-5-20250929`
- OpenAI: `gpt-4-turbo-preview` (or latest GPT-4)
- Ollama: `llama2` (or configured local model)
- Perplexity: `sonar-medium-chat`
- Grok: `grok-1` (or latest)
- Gemini: `gemini-pro`

## Enumerations {#enumerations}

### LLMProviders

Available AI model providers.

```typescript
enum LLMProviders {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  OLLAMA = 'ollama',
  PERPLEXITY = 'perplexity',
  GROK = 'grok',
  OLANE = 'olane'
}
```

> **Note**: Gemini is supported as a provider (`o://gemini`) with `GeminiIntelligenceTool`, but is not currently listed in the `LLMProviders` enum. It can be used by directly addressing `o://gemini` when the provider is initialized.

### HostModelProvider

Where AI models are hosted.

```typescript
enum HostModelProvider {
  OLANE = 'olane',  // Hosted on Olane infrastructure
  LOCAL = 'local'   // Hosted locally (e.g., Ollama)
}
```

### IntelligenceStorageKeys

Keys used for secure storage.

```typescript
enum IntelligenceStorageKeys {
  MODEL_PROVIDER_PREFERENCE = 'model-provider-preference',
  HOSTING_PROVIDER_PREFERENCE = 'hosting-provider-preference',
  API_KEY_SUFFIX = 'api-key',
  ACCESS_TOKEN = 'access-token',
  OLANE_ADDRESS = 'olane-address'
}
```

## Architecture {#architecture}

`o-intelligence` follows the **Coordinator + Specialists** pattern:

```
                    ┌──────────────────────────────┐
                    │  IntelligenceTool            │
                    │  o://intelligence            │
                    │  (Router/Coordinator)        │
                    │                              │
                    │  Responsibilities:           │
                    │  • Provider selection        │
                    │  • API key management        │
                    │  • Request routing           │
                    └──────────────────────────────┘
                              ⬇ manages
        ┌─────────┬─────────┬─────────┬──────────┬──────┬────────┐
        ⬇         ⬇         ⬇         ⬇          ⬇      ⬇        ⬇
┌─────────────┐ ┌───────┐ ┌────────┐ ┌──────────┐ ┌────┐ ┌──────┐
│Anthropic    │ │OpenAI │ │Ollama  │ │Perplexity│ │Grok│ │Gemini│
│o://anthropic│ │o://   │ │o://    │ │o://sonar │ │o:// │ │o://  │
│             │ │openai │ │ollama  │ │          │ │grok│ │gemini│
│Tools:       │ │       │ │        │ │          │ │    │ │      │
│• completion │ │Same   │ │Same    │ │Same      │ │Same│ │Same  │
│• generate   │ │tools  │ │tools   │ │tools     │ │    │ │      │
│• list_models│ │       │ │        │ │          │ │    │ │      │
│• model_info │ │       │ │        │ │          │ │    │ │      │
│• status     │ │       │ │        │ │          │ │    │ │      │
└─────────────┘ └───────┘ └────────┘ └──────────┘ └────┘ └──────┘
```

**Design Benefits:**
- **Unified Interface**: Single API for all providers
- **Provider Abstraction**: Switch providers without code changes
- **Automatic Fallback**: Can implement multi-provider strategies
- **Secure Credentials**: API keys managed centrally via `o://secure`
- **Extensible**: Add new providers by creating child nodes

## Troubleshooting {#troubleshooting}

### Error: API key is required

**Cause:** No API key found in environment variables or secure storage

**Solution:** Set the appropriate environment variable:
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
# or
export OPENAI_API_KEY="sk-..."
```

Or configure interactively:
```typescript
await intelligence.use(new oAddress('o://intelligence'), {
  method: 'configure',
  params: {
    modelProvider: 'anthropic'
  }
});
// Will prompt for API key
```

---

### Error: Invalid model provider choice

**Cause:** `MODEL_PROVIDER_CHOICE` environment variable set to invalid value

**Solution:** Use a valid provider:
```bash
export MODEL_PROVIDER_CHOICE="anthropic"  # anthropic, openai, ollama, perplexity, grok, gemini
```

---

### Error: Provider API is not accessible

**Cause:** Network issue or invalid API key

**Solution:** Check API key validity and network connectivity:
```typescript
// Test provider status
const status = await intelligence.use(new oAddress('o://anthropic'), {
  method: 'status',
  params: {
    apiKey: process.env.ANTHROPIC_API_KEY
  }
});

console.log(status.result.data);
```

---

### Error: Model not found

**Cause:** Specified model ID doesn't exist for the provider

**Solution:** List available models:
```typescript
const models = await intelligence.use(new oAddress('o://anthropic'), {
  method: 'list_models',
  params: {}
});

console.log(models.result.data.models.map(m => m.id));
```

---

### Ollama Connection Failed

**Cause:** Ollama not running locally

**Solution:** Start Ollama service:
```bash
# Install Ollama (if not installed)
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
ollama serve

# Pull a model
ollama pull llama2
```

---

### High Token Usage

**Cause:** Conversation history growing too large

**Solution:** Limit conversation history:
```typescript
// Keep only last N messages
const MAX_HISTORY = 10;
if (conversationHistory.length > MAX_HISTORY) {
  conversationHistory = conversationHistory.slice(-MAX_HISTORY);
}
```

Or use `max_tokens` parameter:
```typescript
await intelligence.use(new oAddress('o://anthropic'), {
  method: 'completion',
  params: {
    messages: conversationHistory,
    max_tokens: 500  // Limit response length
  }
});
```

## Dependencies {#dependencies}

**Peer Dependencies:**
- `@olane/o-core@^0.7.2` - Core Olane types and utilities
- `@olane/o-config@^0.7.2` - Configuration management
- `@olane/o-protocol@^0.7.2` - Protocol definitions
- `@olane/o-tool@^0.7.2` - Tool base classes
- `@olane/o-lane@^0.7.2` - Lane capability loop

**Required Nodes:**
- `o://secure` - Secure credential storage
- `o://human` - Human interaction for prompts (optional)
- `o://setup` - Setup and configuration (optional)

**External APIs:**
- Anthropic API: `https://api.anthropic.com/v1/`
- OpenAI API: `https://api.openai.com/v1/`
- Ollama: `http://localhost:11434` (local)
- Perplexity API: Provider-specific endpoint
- Grok API: Provider-specific endpoint
- Gemini API: `https://generativelanguage.googleapis.com/v1/`

## Package Information {#package-information}

- **Name**: `@olane/o-intelligence`
- **Version**: 0.7.2
- **License**: ISC
- **Type**: ESM (ES Module)
- **Repository**: https://github.com/olane-labs/olane

## Related {#related}

- **Concept**: [Tools, Nodes, and Applications](/concepts/tools-nodes-applications)
- **Package**: [@olane/o-lane - Lane Capability Loop](/packages/o-lane)
- **Package**: [@olane/o-node - Node Foundation](/packages/o-node)
- **Package**: [@olane/o-tool - Tool Base Classes](/packages/o-tool)
- **Node**: [o://secure - Secure Storage](/nodes/secure)
- **Node**: [o://human - Human Interaction](/nodes/human)

## Contributing {#contributing}

### Adding a New Provider

To add a new LLM provider:

1. Create a new provider tool (e.g., `new-provider-intelligence.tool.ts`):

```typescript
import { oLaneTool } from '@olane/o-lane';
import { oAddress, oRequest } from '@olane/o-core';
import { ToolResult } from '@olane/o-tool';
import { LLM_PARAMS } from './methods/llm.methods.js';

export class NewProviderIntelligenceTool extends oLaneTool {
  private defaultModel = 'model-name';
  private apiKey: string = process.env.NEW_PROVIDER_API_KEY || '';

  constructor(config: oNodeToolConfig) {
    super({
      ...config,
      address: new oAddress('o://new-provider'),
      description: 'Intelligence tool using New Provider',
      methods: LLM_PARAMS,
      dependencies: []
    });
  }

  async _tool_completion(request: oRequest): Promise<ToolResult> {
    // Implement completion logic
  }

  async _tool_generate(request: oRequest): Promise<ToolResult> {
    // Implement generation logic
  }

  async _tool_list_models(request: oRequest): Promise<ToolResult> {
    // Implement model listing
  }

  async _tool_model_info(request: oRequest): Promise<ToolResult> {
    // Implement model info retrieval
  }

  async _tool_status(request: oRequest): Promise<ToolResult> {
    // Implement status check
  }
}
```

2. Update `LLMProviders` enum:

```typescript
export enum LLMProviders {
  // ... existing providers
  NEW_PROVIDER = 'new-provider'
}
```

3. Register in `IntelligenceTool.initialize()`:

```typescript
async initialize(): Promise<void> {
  await super.initialize();
  // ... existing providers

  const newProviderTool = new NewProviderIntelligenceTool({
    ...this.config,
    parent: this.address,
    leader: this.leader
  });
  await newProviderTool.start();
  this.addChildNode(newProviderTool);
}
```

4. Export in `index.ts`:

```typescript
export * from './new-provider-intelligence.tool.js';
```

5. Update `getProviderApiKey()` in `o-intelligence.tool.ts` to include the new provider's environment variable.

## Best Practices {#best-practices}

1. **Always handle API key securely** - Never commit keys to version control
2. **Set `max_tokens` appropriately** - Control costs and response length
3. **Implement error handling** - API calls can fail, always catch errors
4. **Use system prompts** - Guide model behavior for consistent results
5. **Monitor token usage** - Track usage to optimize costs
6. **Cache responses** - Consider caching for repeated prompts
7. **Test locally first** - Use Ollama for development before using paid APIs
8. **Version your prompts** - Track prompt changes like code changes

## License {#license}

ISC License - Copyright (c) oLane Inc.

