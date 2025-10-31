import { oAddress } from '@olane/o-core';
import { expect } from 'chai';
import dotenv from 'dotenv';
import { defaultOSInstance } from '../utils/os.default.js';
import { OlaneOSSystemStatus } from '../../src/o-olane-os/enum/o-os.status-enum.js';

dotenv.config();

const network = defaultOSInstance;

describe('streaming-usage @initialize', async () => {
  it('should be able to startup the network', async () => {
    await network.start();
    expect(network.status).to.equal(OlaneOSSystemStatus.RUNNING);
  });
});

describe('intelligence provider streaming tests', () => {
  it('should stream from Intelligence Router (default provider)', async function () {
    const entryNode = network.entryNode();
    let fullText = '';
    let chunkCount = 0;
    let lastChunk: any = null;

    console.log('\n  Testing Intelligence Router streaming...');

    for await (const chunk of entryNode.useStreaming(
      new oAddress('o://intelligence'),
      {
        method: 'stream_prompt',
        params: {
          prompt: 'Say hello in 5 words',
        },
      },
    )) {
      chunkCount++;
      if (chunk.text) {
        fullText += chunk.text;
        console.log('Chunk:', chunk.text);
        process.stdout.write(chunk.text);
      }
      lastChunk = chunk;
    }

    console.log(`\n  Received ${chunkCount} chunks`);
    console.log(`  Full response: "${fullText}"\n`);

    expect(chunkCount).to.be.greaterThan(0);
    expect(fullText).to.not.be.empty;
    expect(lastChunk?.isComplete).to.be.true;
  });

  it('should stream from Anthropic', async function () {
    const entryNode = network.entryNode();
    let fullText = '';
    let chunkCount = 0;
    let lastChunk: any = null;

    console.log('\n  Testing Anthropic streaming...');

    for await (const chunk of entryNode.useStreaming(
      new oAddress('o://anthropic'),
      {
        method: 'stream_completion',
        params: {
          messages: [{ role: 'user', content: 'Say hello in 5 words' }],
          max_tokens: 50,
        },
      },
    )) {
      chunkCount++;
      if (chunk.text) {
        fullText += chunk.text;
        process.stdout.write(chunk.text);
      }
      lastChunk = chunk;
    }

    console.log(`\n  Received ${chunkCount} chunks`);
    console.log(`  Full response: "${fullText}"\n`);

    expect(chunkCount).to.be.greaterThan(0);
    expect(fullText).to.not.be.empty;
    expect(lastChunk?.isComplete).to.be.true;
  });

  it('should stream from OpenAI', async function () {
    const entryNode = network.entryNode();
    let fullText = '';
    let chunkCount = 0;
    let lastChunk: any = null;

    console.log('\n  Testing OpenAI streaming...');

    for await (const chunk of entryNode.useStreaming(
      new oAddress('o://openai'),
      {
        method: 'stream_completion',
        params: {
          messages: [{ role: 'user', content: 'Say hello in 5 words' }],
          max_tokens: 50,
        },
      },
    )) {
      chunkCount++;
      if (chunk.text) {
        fullText += chunk.text;
        process.stdout.write(chunk.text);
      }
      lastChunk = chunk;
    }

    console.log(`\n  Received ${chunkCount} chunks`);
    console.log(`  Full response: "${fullText}"\n`);

    expect(chunkCount).to.be.greaterThan(0);
    expect(fullText).to.not.be.empty;
    expect(lastChunk?.isComplete).to.be.true;
  });

  it('should stream from Ollama', async function () {
    const entryNode = network.entryNode();
    let fullText = '';
    let chunkCount = 0;
    let lastChunk: any = null;

    console.log('\n  Testing Ollama streaming...');

    for await (const chunk of entryNode.useStreaming(
      new oAddress('o://ollama'),
      {
        method: 'stream_completion',
        params: {
          messages: [{ role: 'user', content: 'Say hello in 5 words' }],
          model: 'llama3.2:latest', // Default model
        },
      },
    )) {
      chunkCount++;
      if (chunk.text) {
        fullText += chunk.text;
        process.stdout.write(chunk.text);
      }
      lastChunk = chunk;
    }

    console.log(`\n  Received ${chunkCount} chunks`);
    console.log(`  Full response: "${fullText}"\n`);

    expect(chunkCount).to.be.greaterThan(0);
    expect(fullText).to.not.be.empty;
    expect(lastChunk?.isComplete).to.be.true;
  });

  it('should stream from Perplexity', async function () {
    const entryNode = network.entryNode();
    let fullText = '';
    let chunkCount = 0;
    let lastChunk: any = null;

    console.log('\n  Testing Perplexity streaming...');

    for await (const chunk of entryNode.useStreaming(
      new oAddress('o://perplexity'),
      {
        method: 'stream_completion',
        params: {
          messages: [{ role: 'user', content: 'Say hello in 5 words' }],
          max_tokens: 50,
        },
      },
    )) {
      chunkCount++;
      if (chunk.text) {
        fullText += chunk.text;
        process.stdout.write(chunk.text);
      }
      lastChunk = chunk;
    }

    console.log(`\n  Received ${chunkCount} chunks`);
    console.log(`  Full response: "${fullText}"\n`);

    expect(chunkCount).to.be.greaterThan(0);
    expect(fullText).to.not.be.empty;
    expect(lastChunk?.isComplete).to.be.true;
  });

  it('should stream from Grok', async function () {
    const entryNode = network.entryNode();
    let fullText = '';
    let chunkCount = 0;
    let lastChunk: any = null;

    console.log('\n  Testing Grok streaming...');

    for await (const chunk of entryNode.useStreaming(new oAddress('o://grok'), {
      method: 'stream_completion',
      params: {
        messages: [{ role: 'user', content: 'Say hello in 5 words' }],
        max_tokens: 50,
      },
    })) {
      chunkCount++;
      if (chunk.text) {
        fullText += chunk.text;
        process.stdout.write(chunk.text);
      }
      lastChunk = chunk;
    }

    console.log(`\n  Received ${chunkCount} chunks`);
    console.log(`  Full response: "${fullText}"\n`);

    expect(chunkCount).to.be.greaterThan(0);
    expect(fullText).to.not.be.empty;
    expect(lastChunk?.isComplete).to.be.true;
  });

  it('should stream from Gemini', async function () {
    const entryNode = network.entryNode();
    let fullText = '';
    let chunkCount = 0;
    let lastChunk: any = null;

    console.log('\n  Testing Gemini streaming...');

    for await (const chunk of entryNode.useStreaming(
      new oAddress('o://gemini'),
      {
        method: 'stream_completion',
        params: {
          messages: [{ role: 'user', content: 'Say hello in 5 words' }],
          max_tokens: 50,
        },
      },
    )) {
      chunkCount++;
      if (chunk.text) {
        fullText += chunk.text;
        process.stdout.write(chunk.text);
      }
      lastChunk = chunk;
    }

    console.log(`\n  Received ${chunkCount} chunks`);
    console.log(`  Full response: "${fullText}"\n`);

    expect(chunkCount).to.be.greaterThan(0);
    expect(fullText).to.not.be.empty;
    expect(lastChunk?.isComplete).to.be.true;
  });
});

describe('multi-hop streaming tests', () => {
  it('should stream through Intelligence Router to Anthropic (2-hop)', async function () {
    const entryNode = network.entryNode();
    let fullText = '';
    let chunkCount = 0;
    let lastChunk: any = null;

    console.log('\n  Testing 2-hop streaming (Intelligence Router → Anthropic)...');

    // The intelligence router will route to a specific provider
    for await (const chunk of entryNode.useStreaming(
      new oAddress('o://intelligence'),
      {
        method: 'stream_prompt',
        params: {
          prompt: 'Count to 5',
          provider: 'anthropic', // Force routing to Anthropic
        },
      },
    )) {
      chunkCount++;
      if (chunk.text) {
        fullText += chunk.text;
        process.stdout.write(chunk.text);
      }
      lastChunk = chunk;
    }

    console.log(`\n  Received ${chunkCount} chunks through 2-hop routing`);
    console.log(`  Full response: "${fullText}"\n`);

    expect(chunkCount).to.be.greaterThan(0);
    expect(fullText).to.not.be.empty;
    expect(lastChunk?.isComplete).to.be.true;
  });

  it('should stream through Intelligence Router to OpenAI (2-hop)', async function () {
    const entryNode = network.entryNode();
    let fullText = '';
    let chunkCount = 0;
    let lastChunk: any = null;

    console.log('\n  Testing 2-hop streaming (Intelligence Router → OpenAI)...');

    for await (const chunk of entryNode.useStreaming(
      new oAddress('o://intelligence'),
      {
        method: 'stream_prompt',
        params: {
          prompt: 'Say hello',
          provider: 'openai', // Force routing to OpenAI
        },
      },
    )) {
      chunkCount++;
      if (chunk.text) {
        fullText += chunk.text;
        process.stdout.write(chunk.text);
      }
      lastChunk = chunk;
    }

    console.log(`\n  Received ${chunkCount} chunks through 2-hop routing`);
    console.log(`  Full response: "${fullText}"\n`);

    expect(chunkCount).to.be.greaterThan(0);
    expect(fullText).to.not.be.empty;
    expect(lastChunk?.isComplete).to.be.true;
  });

  it('should handle streaming with routing correctly (verify chunk order)', async function () {
    const entryNode = network.entryNode();
    const chunks: any[] = [];

    console.log('\n  Testing chunk ordering through routing...');

    for await (const chunk of entryNode.useStreaming(
      new oAddress('o://anthropic'),
      {
        method: 'stream_completion',
        params: {
          messages: [{ role: 'user', content: 'Count: 1, 2, 3, 4, 5' }],
          max_tokens: 50,
        },
      },
    )) {
      chunks.push(chunk);
      if (chunk.text) {
        process.stdout.write(chunk.text);
      }
    }

    console.log(`\n  Received ${chunks.length} chunks\n`);

    // Verify chunks are in order (sequence numbers should increment)
    for (let i = 0; i < chunks.length - 1; i++) {
      if (chunks[i].position !== undefined && chunks[i + 1].position !== undefined) {
        expect(chunks[i + 1].position).to.be.greaterThanOrEqual(chunks[i].position);
      }
    }

    // Verify last chunk is marked as complete
    const lastChunk = chunks[chunks.length - 1];
    expect(lastChunk?.isComplete).to.be.true;

    console.log('  ✓ Chunks are in correct order');
  });

  it('should handle backpressure correctly during streaming', async function () {
    const entryNode = network.entryNode();
    let chunkCount = 0;
    let processingTime = 0;

    console.log('\n  Testing backpressure handling...');

    const startTime = Date.now();

    for await (const chunk of entryNode.useStreaming(
      new oAddress('o://anthropic'),
      {
        method: 'stream_completion',
        params: {
          messages: [{ role: 'user', content: 'Write a short poem' }],
          max_tokens: 100,
        },
      },
    )) {
      chunkCount++;
      if (chunk.text) {
        process.stdout.write(chunk.text);
      }

      // Simulate slow consumer (backpressure)
      if (chunkCount % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    processingTime = Date.now() - startTime;

    console.log(`\n  Processed ${chunkCount} chunks in ${processingTime}ms`);
    console.log(`  Average: ${(processingTime / chunkCount).toFixed(2)}ms per chunk\n`);

    expect(chunkCount).to.be.greaterThan(0);
    // Backpressure should work without errors
  });
});

describe('streaming-usage @stop-network', async () => {
  it('should be able to stop the network', async () => {
    await network.stop();
    expect(network.status).to.equal(OlaneOSSystemStatus.STOPPED);
  });
});
