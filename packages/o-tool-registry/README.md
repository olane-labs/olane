# o-Tool Registry

A registry of tools for the oLane network, including the OllamaIntelligenceTool for interacting with local Ollama instances.

## OllamaIntelligenceTool

The `OllamaIntelligenceTool` provides a comprehensive API interface to interact with a local Ollama instance. It supports chat completion, text generation, model management, and server status monitoring.

### Features

- **Chat Completion**: Multi-turn conversations with Ollama models
- **Text Generation**: Single-prompt text generation
- **Model Management**: List, pull, delete, and get information about models
- **Server Status**: Check if Ollama server is running
- **Configurable**: Customizable base URL and default model

### Configuration

The tool accepts the following configuration options:

```typescript
{
  ollamaUrl: 'http://localhost:11434', // Default Ollama server URL
  defaultModel: 'llama2'               // Default model to use
}
```

### Available Methods

#### 1. `completion` - Chat Completion

Performs chat completion with a conversation history.

**Parameters:**
- `model` (string, optional): Model name to use (defaults to configured default)
- `messages` (array, required): Array of chat messages with role and content
- `options` (object, optional): Generation options (temperature, top_p, etc.)

**Example:**
```json
{
  "method": "completion",
  "params": {
    "model": "llama2",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "What is the capital of France?"}
    ],
    "options": {
      "temperature": 0.7,
      "top_p": 0.9
    }
  }
}
```

#### 2. `generate` - Text Generation

Generates text from a single prompt.

**Parameters:**
- `model` (string, optional): Model name to use (defaults to configured default)
- `prompt` (string, required): Text prompt for generation
- `system` (string, optional): System prompt
- `options` (object, optional): Generation options

**Example:**
```json
{
  "method": "generate",
  "params": {
    "model": "llama2",
    "prompt": "Write a short story about a robot learning to paint.",
    "system": "You are a creative writing assistant.",
    "options": {
      "temperature": 0.8,
      "num_predict": 200
    }
  }
}
```

#### 3. `list_models` - List Available Models

Lists all available models on the Ollama server.

**Parameters:** None

**Example:**
```json
{
  "method": "list_models",
  "params": {}
}
```

#### 4. `pull_model` - Pull a Model

Downloads a model from the Ollama library.

**Parameters:**
- `model` (string, required): Model name to pull
- `insecure` (boolean, optional): Allow insecure registry connections (default: false)

**Example:**
```json
{
  "method": "pull_model",
  "params": {
    "model": "llama2:7b",
    "insecure": false
  }
}
```

#### 5. `delete_model` - Delete a Model

Removes a model from the local Ollama installation.

**Parameters:**
- `model` (string, required): Model name to delete

**Example:**
```json
{
  "method": "delete_model",
  "params": {
    "model": "llama2:7b"
  }
}
```

#### 6. `model_info` - Get Model Information

Retrieves detailed information about a specific model.

**Parameters:**
- `model` (string, optional): Model name (defaults to configured default)

**Example:**
```json
{
  "method": "model_info",
  "params": {
    "model": "llama2"
  }
}
```

#### 7. `status` - Check Server Status

Checks if the Ollama server is running and accessible.

**Parameters:** None

**Example:**
```json
{
  "method": "status",
  "params": {}
}
```

### Generation Options

All generation methods support the following options:

- `temperature` (number): Controls randomness (0.0 to 1.0)
- `top_p` (number): Nucleus sampling parameter (0.0 to 1.0)
- `top_k` (number): Top-k sampling parameter
- `num_predict` (number): Maximum number of tokens to generate
- `stop` (array): Array of strings to stop generation
- `seed` (number): Random seed for reproducible results
- `num_ctx` (number): Context window size
- `num_gpu` (number): Number of GPUs to use
- `num_thread` (number): Number of CPU threads to use
- `repeat_penalty` (number): Penalty for repeating tokens
- `repeat_last_n` (number): Number of tokens to consider for repetition penalty
- `tfs_z` (number): Tail free sampling parameter
- `mirostat` (number): Mirostat sampling algorithm (0, 1, or 2)
- `mirostat_tau` (number): Mirostat target entropy
- `mirostat_eta` (number): Mirostat learning rate
- `penalize_newline` (boolean): Penalize newline tokens
- `presence_penalty` (number): Presence penalty
- `frequency_penalty` (number): Frequency penalty

### Response Format

All methods return a `ToolResult` object with the following structure:

**Success Response:**
```json
{
  "success": true,
  "response": "Generated text content",
  "model": "model_name",
  "done": true,
  "total_duration": 1234,
  "eval_count": 50,
  "eval_duration": 1000
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error description"
}
```

### Prerequisites

1. **Ollama Installation**: Make sure Ollama is installed and running locally
2. **Model Availability**: Ensure the required models are available or can be pulled
3. **Network Access**: The tool needs network access to pull models from the Ollama library

### Getting Started

1. Start your Ollama server:
   ```bash
   ollama serve
   ```

2. Pull a model (if not already available):
   ```bash
   ollama pull llama2
   ```

3. Use the tool through the oLane network with the appropriate method calls.

### Error Handling

The tool provides comprehensive error handling for:
- Network connectivity issues
- Invalid model names
- Missing required parameters
- Ollama server errors
- Model availability issues

### Performance Considerations

- **Streaming**: The tool currently uses non-streaming responses for simplicity
- **Timeout**: Consider setting appropriate timeouts for long-running operations
- **Memory**: Large models may require significant memory resources
- **GPU**: Enable GPU acceleration in Ollama for better performance

### Security Notes

- The tool connects to localhost by default for security
- Use HTTPS when connecting to remote Ollama instances
- Be cautious with the `insecure` flag when pulling models
- Validate all input parameters before processing
