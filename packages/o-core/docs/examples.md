---
title: "Practical Examples - Real-world Olane Node Implementations"
description: "Complete examples of different types of Olane nodes including microservices, AI agents, storage systems, and more"
---

# Practical Examples

This document provides complete, real-world examples of different types of Olane nodes. Each example includes full implementation details, configuration, and usage patterns.

## Example 1: Microservice API Node

A node that exposes REST-like APIs through the Olane network.

```typescript
import { 
  oCore, 
  oAddress, 
  NodeType, 
  oConnection, 
  oConnectionConfig,
  oRequest,
  oResponse,
  oRouter,
  oAddressResolution
} from '@olane/o-core';

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export class UserServiceNode extends oCore {
  private users: Map<string, User> = new Map();
  private httpServer: any;
  
  constructor(address: string, port: number = 8080) {
    super({
      address: new oAddress(address),
      type: NodeType.WORKER,
      name: 'user-service',
      description: 'User management microservice',
      methods: {
        'users.create': {
          name: 'users.create',
          description: 'Create a new user',
          parameters: {
            name: { type: 'string', required: true },
            email: { type: 'string', required: true }
          }
        },
        'users.get': {
          name: 'users.get',
          description: 'Get user by ID',
          parameters: {
            id: { type: 'string', required: true }
          }
        },
        'users.list': {
          name: 'users.list',
          description: 'List all users',
          parameters: {
            limit: { type: 'number', required: false, default: 10 },
            offset: { type: 'number', required: false, default: 0 }
          }
        },
        'users.update': {
          name: 'users.update',
          description: 'Update user',
          parameters: {
            id: { type: 'string', required: true },
            name: { type: 'string', required: false },
            email: { type: 'string', required: false }
          }
        },
        'users.delete': {
          name: 'users.delete',
          description: 'Delete user',
          parameters: {
            id: { type: 'string', required: true }
          }
        }
      }
    });
  }
  
  configureTransports() {
    return [
      new oCustomTransport(`http://localhost:${this.config.port}`)
    ];
  }
  
  async connect(nextHopAddress: oAddress, targetAddress: oAddress): Promise<oConnection> {
    return new HttpConnection({
      nextHopAddress,
      targetAddress,
      callerAddress: this.address
    });
  }
  
  initializeRouter() {
    this.router = new ServiceRouter(this);
  }
  
  async register() {
    // Register with service discovery
    await this.registerWithServiceDiscovery();
  }
  
  async unregister() {
    await this.unregisterFromServiceDiscovery();
  }
  
  async initialize() {
    await super.initialize();
    await this.startHttpServer();
    this.seedTestData();
  }
  
  async teardown() {
    if (this.httpServer) {
      this.httpServer.close();
    }
    await super.teardown();
  }
  
  // API Methods Implementation
  async handleRequest(method: string, params: any): Promise<any> {
    switch (method) {
      case 'users.create':
        return await this.createUser(params);
      
      case 'users.get':
        return await this.getUser(params.id);
      
      case 'users.list':
        return await this.listUsers(params.limit || 10, params.offset || 0);
      
      case 'users.update':
        return await this.updateUser(params.id, params);
      
      case 'users.delete':
        return await this.deleteUser(params.id);
      
      default:
        throw new Error(`Method ${method} not supported`);
    }
  }
  
  private async createUser(userData: { name: string; email: string }): Promise<User> {
    const user: User = {
      id: this.generateId(),
      name: userData.name,
      email: userData.email,
      createdAt: new Date()
    };
    
    this.users.set(user.id, user);
    this.logger.info(`Created user: ${user.id}`);
    
    return user;
  }
  
  private async getUser(id: string): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User ${id} not found`);
    }
    return user;
  }
  
  private async listUsers(limit: number, offset: number): Promise<{ users: User[]; total: number }> {
    const allUsers = Array.from(this.users.values());
    const users = allUsers.slice(offset, offset + limit);
    
    return {
      users,
      total: allUsers.length
    };
  }
  
  private async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const user = await this.getUser(id);
    
    if (updates.name) user.name = updates.name;
    if (updates.email) user.email = updates.email;
    
    this.users.set(id, user);
    this.logger.info(`Updated user: ${id}`);
    
    return user;
  }
  
  private async deleteUser(id: string): Promise<{ deleted: boolean }> {
    const exists = this.users.has(id);
    if (!exists) {
      throw new Error(`User ${id} not found`);
    }
    
    this.users.delete(id);
    this.logger.info(`Deleted user: ${id}`);
    
    return { deleted: true };
  }
  
  private generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private seedTestData(): void {
    const testUsers = [
      { name: 'Alice Johnson', email: 'alice@example.com' },
      { name: 'Bob Smith', email: 'bob@example.com' },
      { name: 'Carol Davis', email: 'carol@example.com' }
    ];
    
    testUsers.forEach(userData => {
      this.createUser(userData);
    });
  }
  
  private async startHttpServer(): Promise<void> {
    const express = require('express');
    const app = express();
    
    app.use(express.json());
    
    // REST endpoints that proxy to Olane methods
    app.post('/users', async (req, res) => {
      try {
        const user = await this.handleRequest('users.create', req.body);
        res.status(201).json(user);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });
    
    app.get('/users/:id', async (req, res) => {
      try {
        const user = await this.handleRequest('users.get', { id: req.params.id });
        res.json(user);
      } catch (error) {
        res.status(404).json({ error: error.message });
      }
    });
    
    app.get('/users', async (req, res) => {
      try {
        const result = await this.handleRequest('users.list', req.query);
        res.json(result);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });
    
    this.httpServer = app.listen(this.config.port, () => {
      this.logger.info(`HTTP server listening on port ${this.config.port}`);
    });
  }
}

// Usage
const userService = new UserServiceNode('o://microservices/user-service', 3001);
await userService.start();

// Test the service
const newUser = await userService.use(
  new oAddress('o://microservices/user-service/users.create'),
  {
    method: 'users.create',
    params: { name: 'John Doe', email: 'john@example.com' }
  }
);
console.log('Created user:', newUser.result);
```

## Example 2: AI Agent Node

A node that provides AI processing capabilities with conversation memory.

```typescript
import { oCore, oAddress, NodeType } from '@olane/o-core';

interface Conversation {
  id: string;
  messages: Message[];
  context: any;
  createdAt: Date;
  updatedAt: Date;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export class AIAgentNode extends oCore {
  private conversations: Map<string, Conversation> = new Map();
  private aiClient: any; // Your AI client (OpenAI, etc.)
  
  constructor(address: string, aiConfig: any) {
    super({
      address: new oAddress(address),
      type: NodeType.WORKER,
      name: 'ai-agent',
      description: 'AI conversation and processing agent',
      methods: {
        'chat.send': {
          name: 'chat.send',
          description: 'Send a message and get AI response',
          parameters: {
            conversationId: { type: 'string', required: false },
            message: { type: 'string', required: true },
            context: { type: 'object', required: false }
          }
        },
        'chat.history': {
          name: 'chat.history',
          description: 'Get conversation history',
          parameters: {
            conversationId: { type: 'string', required: true }
          }
        },
        'analyze.text': {
          name: 'analyze.text',
          description: 'Analyze text for sentiment, keywords, etc.',
          parameters: {
            text: { type: 'string', required: true },
            analysisType: { type: 'string', required: false, default: 'sentiment' }
          }
        },
        'generate.code': {
          name: 'generate.code',
          description: 'Generate code based on requirements',
          parameters: {
            requirements: { type: 'string', required: true },
            language: { type: 'string', required: false, default: 'javascript' }
          }
        }
      }
    });
    
    this.initializeAIClient(aiConfig);
  }
  
  private initializeAIClient(config: any): void {
    // Initialize your AI client here
    // this.aiClient = new OpenAI({ apiKey: config.apiKey });
  }
  
  configureTransports() {
    return [
      new oCustomTransport('ws://localhost:8080/ai-agent')
    ];
  }
  
  async handleRequest(method: string, params: any): Promise<any> {
    switch (method) {
      case 'chat.send':
        return await this.sendChatMessage(
          params.message, 
          params.conversationId, 
          params.context
        );
      
      case 'chat.history':
        return await this.getChatHistory(params.conversationId);
      
      case 'analyze.text':
        return await this.analyzeText(params.text, params.analysisType);
      
      case 'generate.code':
        return await this.generateCode(params.requirements, params.language);
      
      default:
        throw new Error(`Method ${method} not supported`);
    }
  }
  
  private async sendChatMessage(
    message: string, 
    conversationId?: string, 
    context?: any
  ): Promise<any> {
    // Get or create conversation
    let conversation = conversationId 
      ? this.conversations.get(conversationId)
      : null;
    
    if (!conversation) {
      conversation = {
        id: conversationId || this.generateConversationId(),
        messages: [],
        context: context || {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    
    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    conversation.messages.push(userMessage);
    
    // Generate AI response
    const aiResponse = await this.generateAIResponse(conversation);
    
    // Add AI message
    const aiMessage: Message = {
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date()
    };
    conversation.messages.push(aiMessage);
    
    // Update conversation
    conversation.updatedAt = new Date();
    this.conversations.set(conversation.id, conversation);
    
    return {
      conversationId: conversation.id,
      response: aiResponse,
      messageCount: conversation.messages.length
    };
  }
  
  private async getChatHistory(conversationId: string): Promise<Conversation> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }
    return conversation;
  }
  
  private async analyzeText(text: string, analysisType: string): Promise<any> {
    switch (analysisType) {
      case 'sentiment':
        return await this.analyzeSentiment(text);
      
      case 'keywords':
        return await this.extractKeywords(text);
      
      case 'summary':
        return await this.summarizeText(text);
      
      default:
        throw new Error(`Analysis type ${analysisType} not supported`);
    }
  }
  
  private async generateCode(requirements: string, language: string): Promise<any> {
    // Simulate code generation
    const prompt = `Generate ${language} code for: ${requirements}`;
    const code = await this.callAI(prompt);
    
    return {
      language,
      code,
      requirements,
      generatedAt: new Date()
    };
  }
  
  private async generateAIResponse(conversation: Conversation): Promise<string> {
    // Build context from conversation history
    const messages = conversation.messages.slice(-10); // Last 10 messages
    const context = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    
    // Call AI service
    const response = await this.callAI(context);
    return response;
  }
  
  private async analyzeSentiment(text: string): Promise<any> {
    // Simple sentiment analysis (in real implementation, use AI service)
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disappointing'];
    
    const words = text.toLowerCase().split(' ');
    const positive = words.filter(w => positiveWords.includes(w)).length;
    const negative = words.filter(w => negativeWords.includes(w)).length;
    
    let sentiment = 'neutral';
    if (positive > negative) sentiment = 'positive';
    if (negative > positive) sentiment = 'negative';
    
    return {
      sentiment,
      confidence: Math.abs(positive - negative) / words.length,
      positiveWords: positive,
      negativeWords: negative
    };
  }
  
  private async extractKeywords(text: string): Promise<any> {
    // Simple keyword extraction
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(' ')
      .filter(w => w.length > 3);
    
    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    
    const keywords = Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));
    
    return { keywords };
  }
  
  private async summarizeText(text: string): Promise<any> {
    // Simple summarization (first and last sentences)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length <= 2) {
      return { summary: text };
    }
    
    const summary = `${sentences[0].trim()}... ${sentences[sentences.length - 1].trim()}.`;
    
    return {
      summary,
      originalLength: text.length,
      summaryLength: summary.length,
      compressionRatio: summary.length / text.length
    };
  }
  
  private async callAI(prompt: string): Promise<string> {
    // Simulate AI call (replace with actual AI service)
    await this.sleep(1000);
    return `AI response to: ${prompt.substring(0, 50)}...`;
  }
  
  private generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage
const aiAgent = new AIAgentNode('o://ai/chat-agent', {
  apiKey: process.env.OPENAI_API_KEY
});

await aiAgent.start();

// Test conversation
const chatResponse = await aiAgent.use(
  new oAddress('o://ai/chat-agent/chat.send'),
  {
    method: 'chat.send',
    params: {
      message: 'Hello, how can you help me today?',
      context: { user: 'john_doe', session: 'web_app' }
    }
  }
);

console.log('AI Response:', chatResponse.result);
```

## Example 3: Distributed Storage Node

A node that provides distributed file storage with replication.

```typescript
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { oCore, oAddress, NodeType } from '@olane/o-core';

interface StoredFile {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  checksum: string;
  createdAt: Date;
  replicas: string[]; // Other storage nodes that have copies
}

export class StorageNode extends oCore {
  private files: Map<string, StoredFile> = new Map();
  private storagePath: string;
  private replicationFactor: number = 2;
  
  constructor(address: string, storagePath: string, replicationFactor: number = 2) {
    super({
      address: new oAddress(address),
      type: NodeType.WORKER,
      name: 'storage-node',
      description: 'Distributed file storage node',
      methods: {
        'storage.upload': {
          name: 'storage.upload',
          description: 'Upload a file',
          parameters: {
            filename: { type: 'string', required: true },
            content: { type: 'buffer', required: true },
            mimeType: { type: 'string', required: false }
          }
        },
        'storage.download': {
          name: 'storage.download',
          description: 'Download a file',
          parameters: {
            fileId: { type: 'string', required: true }
          }
        },
        'storage.delete': {
          name: 'storage.delete',
          description: 'Delete a file',
          parameters: {
            fileId: { type: 'string', required: true }
          }
        },
        'storage.list': {
          name: 'storage.list',
          description: 'List stored files',
          parameters: {
            limit: { type: 'number', required: false, default: 50 },
            offset: { type: 'number', required: false, default: 0 }
          }
        },
        'storage.info': {
          name: 'storage.info',
          description: 'Get file information',
          parameters: {
            fileId: { type: 'string', required: true }
          }
        },
        'storage.replicate': {
          name: 'storage.replicate',
          description: 'Replicate a file to this node',
          parameters: {
            fileId: { type: 'string', required: true },
            fileData: { type: 'object', required: true },
            content: { type: 'buffer', required: true }
          }
        }
      }
    });
    
    this.storagePath = storagePath;
    this.replicationFactor = replicationFactor;
  }
  
  async initialize() {
    await super.initialize();
    await this.ensureStorageDirectory();
    await this.loadFileIndex();
  }
  
  configureTransports() {
    return [
      new oCustomTransport(`http://localhost:${this.config.port}/storage`)
    ];
  }
  
  async handleRequest(method: string, params: any): Promise<any> {
    switch (method) {
      case 'storage.upload':
        return await this.uploadFile(params.filename, params.content, params.mimeType);
      
      case 'storage.download':
        return await this.downloadFile(params.fileId);
      
      case 'storage.delete':
        return await this.deleteFile(params.fileId);
      
      case 'storage.list':
        return await this.listFiles(params.limit || 50, params.offset || 0);
      
      case 'storage.info':
        return await this.getFileInfo(params.fileId);
      
      case 'storage.replicate':
        return await this.replicateFile(params.fileId, params.fileData, params.content);
      
      default:
        throw new Error(`Method ${method} not supported`);
    }
  }
  
  private async uploadFile(filename: string, content: Buffer, mimeType?: string): Promise<StoredFile> {
    const fileId = this.generateFileId();
    const checksum = this.calculateChecksum(content);
    
    // Store file locally
    const filePath = path.join(this.storagePath, fileId);
    await fs.writeFile(filePath, content);
    
    // Create file record
    const storedFile: StoredFile = {
      id: fileId,
      filename,
      size: content.length,
      mimeType: mimeType || 'application/octet-stream',
      checksum,
      createdAt: new Date(),
      replicas: [this.address.toString()]
    };
    
    this.files.set(fileId, storedFile);
    await this.saveFileIndex();
    
    // Replicate to other nodes
    await this.replicateToOtherNodes(storedFile, content);
    
    this.logger.info(`Uploaded file: ${filename} (${fileId})`);
    return storedFile;
  }
  
  private async downloadFile(fileId: string): Promise<{ file: StoredFile; content: Buffer }> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new Error(`File ${fileId} not found`);
    }
    
    try {
      // Try to read from local storage
      const filePath = path.join(this.storagePath, fileId);
      const content = await fs.readFile(filePath);
      
      // Verify checksum
      const checksum = this.calculateChecksum(content);
      if (checksum !== file.checksum) {
        throw new Error('File corruption detected');
      }
      
      return { file, content };
    } catch (error) {
      // If local file is corrupted or missing, try replicas
      return await this.downloadFromReplica(file);
    }
  }
  
  private async deleteFile(fileId: string): Promise<{ deleted: boolean }> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new Error(`File ${fileId} not found`);
    }
    
    // Delete local file
    const filePath = path.join(this.storagePath, fileId);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      this.logger.warn(`Failed to delete local file: ${error.message}`);
    }
    
    // Remove from index
    this.files.delete(fileId);
    await this.saveFileIndex();
    
    // Notify replicas to delete
    await this.deleteFromReplicas(file);
    
    this.logger.info(`Deleted file: ${fileId}`);
    return { deleted: true };
  }
  
  private async listFiles(limit: number, offset: number): Promise<{
    files: StoredFile[];
    total: number;
  }> {
    const allFiles = Array.from(this.files.values());
    const files = allFiles.slice(offset, offset + limit);
    
    return {
      files,
      total: allFiles.length
    };
  }
  
  private async getFileInfo(fileId: string): Promise<StoredFile> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new Error(`File ${fileId} not found`);
    }
    return file;
  }
  
  private async replicateFile(fileId: string, fileData: StoredFile, content: Buffer): Promise<{ replicated: boolean }> {
    // Store the replicated file
    const filePath = path.join(this.storagePath, fileId);
    await fs.writeFile(filePath, content);
    
    // Verify checksum
    const checksum = this.calculateChecksum(content);
    if (checksum !== fileData.checksum) {
      await fs.unlink(filePath);
      throw new Error('Replication failed: checksum mismatch');
    }
    
    // Add to local index
    const localFileData = {
      ...fileData,
      replicas: [...fileData.replicas, this.address.toString()]
    };
    this.files.set(fileId, localFileData);
    await this.saveFileIndex();
    
    this.logger.info(`Replicated file: ${fileId}`);
    return { replicated: true };
  }
  
  private async replicateToOtherNodes(file: StoredFile, content: Buffer): Promise<void> {
    // Find other storage nodes
    const storageNodes = await this.findStorageNodes();
    const targetNodes = storageNodes
      .filter(node => node !== this.address.toString())
      .slice(0, this.replicationFactor - 1);
    
    // Replicate to target nodes
    const replicationPromises = targetNodes.map(async (nodeAddress) => {
      try {
        await this.use(
          new oAddress(nodeAddress),
          {
            method: 'storage.replicate',
            params: {
              fileId: file.id,
              fileData: file,
              content: content
            }
          }
        );
        
        // Update replica list
        file.replicas.push(nodeAddress);
      } catch (error) {
        this.logger.error(`Failed to replicate to ${nodeAddress}:`, error);
      }
    });
    
    await Promise.allSettled(replicationPromises);
    
    // Update file record
    this.files.set(file.id, file);
    await this.saveFileIndex();
  }
  
  private async downloadFromReplica(file: StoredFile): Promise<{ file: StoredFile; content: Buffer }> {
    const replicas = file.replicas.filter(r => r !== this.address.toString());
    
    for (const replicaAddress of replicas) {
      try {
        const response = await this.use(
          new oAddress(replicaAddress),
          {
            method: 'storage.download',
            params: { fileId: file.id }
          }
        );
        
        return response.result;
      } catch (error) {
        this.logger.warn(`Failed to download from replica ${replicaAddress}:`, error);
      }
    }
    
    throw new Error('File not available from any replica');
  }
  
  private async deleteFromReplicas(file: StoredFile): Promise<void> {
    const replicas = file.replicas.filter(r => r !== this.address.toString());
    
    const deletePromises = replicas.map(async (replicaAddress) => {
      try {
        await this.use(
          new oAddress(replicaAddress),
          {
            method: 'storage.delete',
            params: { fileId: file.id }
          }
        );
      } catch (error) {
        this.logger.error(`Failed to delete from replica ${replicaAddress}:`, error);
      }
    });
    
    await Promise.allSettled(deletePromises);
  }
  
  private async findStorageNodes(): Promise<string[]> {
    // In a real implementation, this would query the network
    // For now, return known storage nodes
    return [
      'o://storage/node-1',
      'o://storage/node-2',
      'o://storage/node-3'
    ];
  }
  
  private generateFileId(): string {
    return `file_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }
  
  private calculateChecksum(content: Buffer): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
  
  private async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.access(this.storagePath);
    } catch {
      await fs.mkdir(this.storagePath, { recursive: true });
    }
  }
  
  private async saveFileIndex(): Promise<void> {
    const indexPath = path.join(this.storagePath, 'index.json');
    const index = Object.fromEntries(this.files);
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  }
  
  private async loadFileIndex(): Promise<void> {
    const indexPath = path.join(this.storagePath, 'index.json');
    
    try {
      const indexData = await fs.readFile(indexPath, 'utf-8');
      const index = JSON.parse(indexData);
      this.files = new Map(Object.entries(index));
      this.logger.info(`Loaded ${this.files.size} files from index`);
    } catch (error) {
      this.logger.info('No existing file index found, starting fresh');
    }
  }
}

// Usage
const storageNode = new StorageNode(
  'o://storage/node-1',
  './storage-data',
  2 // replication factor
);

await storageNode.start();

// Test file operations
const uploadResult = await storageNode.use(
  new oAddress('o://storage/node-1/storage.upload'),
  {
    method: 'storage.upload',
    params: {
      filename: 'test.txt',
      content: Buffer.from('Hello, distributed storage!'),
      mimeType: 'text/plain'
    }
  }
);

console.log('Upload result:', uploadResult.result);
```

## Example 4: Load Balancer Node

A node that distributes requests across multiple backend services.

```typescript
import { oCore, oAddress, NodeType } from '@olane/o-core';

interface BackendService {
  address: string;
  weight: number;
  healthy: boolean;
  responseTime: number;
  requestCount: number;
  errorCount: number;
  lastHealthCheck: Date;
}

export class LoadBalancerNode extends oCore {
  private backends: Map<string, BackendService> = new Map();
  private roundRobinCounter: number = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  
  constructor(address: string, backends: Array<{ address: string; weight?: number }>) {
    super({
      address: new oAddress(address),
      type: NodeType.BRIDGE,
      name: 'load-balancer',
      description: 'Load balancer and service proxy',
      methods: {
        'proxy.request': {
          name: 'proxy.request',
          description: 'Proxy request to backend service',
          parameters: {
            method: { type: 'string', required: true },
            params: { type: 'object', required: false },
            strategy: { type: 'string', required: false, default: 'round-robin' }
          }
        },
        'backends.add': {
          name: 'backends.add',
          description: 'Add backend service',
          parameters: {
            address: { type: 'string', required: true },
            weight: { type: 'number', required: false, default: 1 }
          }
        },
        'backends.remove': {
          name: 'backends.remove',
          description: 'Remove backend service',
          parameters: {
            address: { type: 'string', required: true }
          }
        },
        'backends.list': {
          name: 'backends.list',
          description: 'List backend services with health status',
          parameters: {}
        },
        'stats.get': {
          name: 'stats.get',
          description: 'Get load balancer statistics',
          parameters: {}
        }
      }
    });
    
    // Initialize backends
    backends.forEach(backend => {
      this.backends.set(backend.address, {
        address: backend.address,
        weight: backend.weight || 1,
        healthy: true,
        responseTime: 0,
        requestCount: 0,
        errorCount: 0,
        lastHealthCheck: new Date()
      });
    });
  }
  
  async initialize() {
    await super.initialize();
    this.startHealthChecks();
  }
  
  async teardown() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    await super.teardown();
  }
  
  configureTransports() {
    return [
      new oCustomTransport(`http://localhost:${this.config.port}/lb`)
    ];
  }
  
  async handleRequest(method: string, params: any): Promise<any> {
    switch (method) {
      case 'proxy.request':
        return await this.proxyRequest(params.method, params.params, params.strategy);
      
      case 'backends.add':
        return await this.addBackend(params.address, params.weight);
      
      case 'backends.remove':
        return await this.removeBackend(params.address);
      
      case 'backends.list':
        return await this.listBackends();
      
      case 'stats.get':
        return await this.getStats();
      
      default:
        throw new Error(`Method ${method} not supported`);
    }
  }
  
  private async proxyRequest(method: string, params: any, strategy: string = 'round-robin'): Promise<any> {
    const backend = this.selectBackend(strategy);
    if (!backend) {
      throw new Error('No healthy backend services available');
    }
    
    const startTime = Date.now();
    backend.requestCount++;
    
    try {
      const response = await this.use(
        new oAddress(backend.address),
        { method, params }
      );
      
      // Update metrics
      backend.responseTime = Date.now() - startTime;
      
      return {
        result: response.result,
        backend: backend.address,
        responseTime: backend.responseTime
      };
    } catch (error) {
      backend.errorCount++;
      
      // Mark backend as unhealthy if error rate is high
      const errorRate = backend.errorCount / backend.requestCount;
      if (errorRate > 0.5 && backend.requestCount > 10) {
        backend.healthy = false;
        this.logger.warn(`Marking backend ${backend.address} as unhealthy`);
      }
      
      // Try another backend
      const fallbackBackend = this.selectBackend(strategy, [backend.address]);
      if (fallbackBackend) {
        this.logger.info(`Retrying request with fallback backend: ${fallbackBackend.address}`);
        return await this.proxyRequest(method, params, strategy);
      }
      
      throw error;
    }
  }
  
  private selectBackend(strategy: string, excludeAddresses: string[] = []): BackendService | null {
    const healthyBackends = Array.from(this.backends.values())
      .filter(b => b.healthy && !excludeAddresses.includes(b.address));
    
    if (healthyBackends.length === 0) {
      return null;
    }
    
    switch (strategy) {
      case 'round-robin':
        return this.roundRobinSelection(healthyBackends);
      
      case 'weighted':
        return this.weightedSelection(healthyBackends);
      
      case 'least-connections':
        return this.leastConnectionsSelection(healthyBackends);
      
      case 'fastest':
        return this.fastestResponseSelection(healthyBackends);
      
      default:
        return this.roundRobinSelection(healthyBackends);
    }
  }
  
  private roundRobinSelection(backends: BackendService[]): BackendService {
    const index = this.roundRobinCounter % backends.length;
    this.roundRobinCounter++;
    return backends[index];
  }
  
  private weightedSelection(backends: BackendService[]): BackendService {
    const totalWeight = backends.reduce((sum, b) => sum + b.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const backend of backends) {
      random -= backend.weight;
      if (random <= 0) {
        return backend;
      }
    }
    
    return backends[0]; // Fallback
  }
  
  private leastConnectionsSelection(backends: BackendService[]): BackendService {
    return backends.reduce((least, current) => 
      current.requestCount < least.requestCount ? current : least
    );
  }
  
  private fastestResponseSelection(backends: BackendService[]): BackendService {
    return backends.reduce((fastest, current) => 
      current.responseTime < fastest.responseTime ? current : fastest
    );
  }
  
  private async addBackend(address: string, weight: number = 1): Promise<{ added: boolean }> {
    if (this.backends.has(address)) {
      throw new Error(`Backend ${address} already exists`);
    }
    
    const backend: BackendService = {
      address,
      weight,
      healthy: true,
      responseTime: 0,
      requestCount: 0,
      errorCount: 0,
      lastHealthCheck: new Date()
    };
    
    this.backends.set(address, backend);
    
    // Perform initial health check
    await this.checkBackendHealth(backend);
    
    this.logger.info(`Added backend: ${address}`);
    return { added: true };
  }
  
  private async removeBackend(address: string): Promise<{ removed: boolean }> {
    if (!this.backends.has(address)) {
      throw new Error(`Backend ${address} not found`);
    }
    
    this.backends.delete(address);
    this.logger.info(`Removed backend: ${address}`);
    return { removed: true };
  }
  
  private async listBackends(): Promise<{ backends: BackendService[] }> {
    return {
      backends: Array.from(this.backends.values())
    };
  }
  
  private async getStats(): Promise<any> {
    const backends = Array.from(this.backends.values());
    const totalRequests = backends.reduce((sum, b) => sum + b.requestCount, 0);
    const totalErrors = backends.reduce((sum, b) => sum + b.errorCount, 0);
    const healthyCount = backends.filter(b => b.healthy).length;
    const avgResponseTime = backends.length > 0 
      ? backends.reduce((sum, b) => sum + b.responseTime, 0) / backends.length 
      : 0;
    
    return {
      totalBackends: backends.length,
      healthyBackends: healthyCount,
      totalRequests,
      totalErrors,
      errorRate: totalRequests > 0 ? totalErrors / totalRequests : 0,
      averageResponseTime: avgResponseTime,
      backends: backends.map(b => ({
        address: b.address,
        healthy: b.healthy,
        requestCount: b.requestCount,
        errorCount: b.errorCount,
        responseTime: b.responseTime,
        weight: b.weight
      }))
    };
  }
  
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      const healthCheckPromises = Array.from(this.backends.values()).map(
        backend => this.checkBackendHealth(backend)
      );
      
      await Promise.allSettled(healthCheckPromises);
    }, 30000); // Check every 30 seconds
  }
  
  private async checkBackendHealth(backend: BackendService): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Simple health check - ping the backend
      await this.use(
        new oAddress(backend.address),
        { method: 'health.check' }
      );
      
      const responseTime = Date.now() - startTime;
      
      // Update health status
      if (!backend.healthy) {
        this.logger.info(`Backend ${backend.address} is now healthy`);
      }
      
      backend.healthy = true;
      backend.responseTime = responseTime;
      backend.lastHealthCheck = new Date();
      
    } catch (error) {
      if (backend.healthy) {
        this.logger.warn(`Backend ${backend.address} failed health check: ${error.message}`);
      }
      
      backend.healthy = false;
      backend.lastHealthCheck = new Date();
    }
  }
}

// Usage
const loadBalancer = new LoadBalancerNode(
  'o://infrastructure/load-balancer',
  [
    { address: 'o://services/api-server-1', weight: 2 },
    { address: 'o://services/api-server-2', weight: 1 },
    { address: 'o://services/api-server-3', weight: 1 }
  ]
);

await loadBalancer.start();

// Test load balancing
const response = await loadBalancer.use(
  new oAddress('o://infrastructure/load-balancer/proxy.request'),
  {
    method: 'proxy.request',
    params: {
      method: 'users.list',
      params: { limit: 10 },
      strategy: 'weighted'
    }
  }
);

console.log('Load balanced response:', response.result);
```

## Example 5: Event-Driven Workflow Node

A node that orchestrates complex workflows with event-driven architecture.

```typescript
import { EventEmitter } from 'events';
import { oCore, oAddress, NodeType } from '@olane/o-core';

interface WorkflowStep {
  id: string;
  name: string;
  type: 'task' | 'decision' | 'parallel' | 'join';
  config: any;
  dependencies: string[];
  timeout?: number;
}

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  variables: { [key: string]: any };
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  currentSteps: string[];
  completedSteps: string[];
  failedSteps: string[];
  variables: { [key: string]: any };
  startTime: Date;
  endTime?: Date;
  error?: string;
}

export class WorkflowNode extends oCore {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private eventEmitter = new EventEmitter();
  
  constructor(address: string) {
    super({
      address: new oAddress(address),
      type: NodeType.WORKER,
      name: 'workflow-engine',
      description: 'Event-driven workflow orchestration engine',
      methods: {
        'workflow.create': {
          name: 'workflow.create',
          description: 'Create a new workflow definition',
          parameters: {
            workflow: { type: 'object', required: true }
          }
        },
        'workflow.execute': {
          name: 'workflow.execute',
          description: 'Execute a workflow',
          parameters: {
            workflowId: { type: 'string', required: true },
            variables: { type: 'object', required: false }
          }
        },
        'workflow.status': {
          name: 'workflow.status',
          description: 'Get workflow execution status',
          parameters: {
            executionId: { type: 'string', required: true }
          }
        },
        'workflow.pause': {
          name: 'workflow.pause',
          description: 'Pause workflow execution',
          parameters: {
            executionId: { type: 'string', required: true }
          }
        },
        'workflow.resume': {
          name: 'workflow.resume',
          description: 'Resume paused workflow',
          parameters: {
            executionId: { type: 'string', required: true }
          }
        },
        'workflow.cancel': {
          name: 'workflow.cancel',
          description: 'Cancel workflow execution',
          parameters: {
            executionId: { type: 'string', required: true }
          }
        }
      }
    });
    
    this.setupEventHandlers();
  }
  
  configureTransports() {
    return [
      new oCustomTransport(`ws://localhost:${this.config.port}/workflow`)
    ];
  }
  
  async handleRequest(method: string, params: any): Promise<any> {
    switch (method) {
      case 'workflow.create':
        return await this.createWorkflow(params.workflow);
      
      case 'workflow.execute':
        return await this.executeWorkflow(params.workflowId, params.variables);
      
      case 'workflow.status':
        return await this.getExecutionStatus(params.executionId);
      
      case 'workflow.pause':
        return await this.pauseExecution(params.executionId);
      
      case 'workflow.resume':
        return await this.resumeExecution(params.executionId);
      
      case 'workflow.cancel':
        return await this.cancelExecution(params.executionId);
      
      default:
        throw new Error(`Method ${method} not supported`);
    }
  }
  
  private setupEventHandlers(): void {
    this.eventEmitter.on('step.completed', async (executionId: string, stepId: string, result: any) => {
      await this.handleStepCompleted(executionId, stepId, result);
    });
    
    this.eventEmitter.on('step.failed', async (executionId: string, stepId: string, error: Error) => {
      await this.handleStepFailed(executionId, stepId, error);
    });
    
    this.eventEmitter.on('execution.completed', (executionId: string) => {
      this.logger.info(`Workflow execution completed: ${executionId}`);
    });
    
    this.eventEmitter.on('execution.failed', (executionId: string, error: string) => {
      this.logger.error(`Workflow execution failed: ${executionId} - ${error}`);
    });
  }
  
  private async createWorkflow(workflowDef: WorkflowDefinition): Promise<{ created: boolean; workflowId: string }> {
    // Validate workflow definition
    this.validateWorkflow(workflowDef);
    
    // Store workflow
    this.workflows.set(workflowDef.id, workflowDef);
    
    this.logger.info(`Created workflow: ${workflowDef.name} (${workflowDef.id})`);
    return { created: true, workflowId: workflowDef.id };
  }
  
  private async executeWorkflow(workflowId: string, variables: any = {}): Promise<{ executionId: string }> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    
    const executionId = this.generateExecutionId();
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status: 'running',
      currentSteps: [],
      completedSteps: [],
      failedSteps: [],
      variables: { ...workflow.variables, ...variables },
      startTime: new Date()
    };
    
    this.executions.set(executionId, execution);
    
    // Start execution by finding initial steps (those with no dependencies)
    const initialSteps = workflow.steps.filter(step => step.dependencies.length === 0);
    await this.executeSteps(executionId, initialSteps.map(s => s.id));
    
    this.logger.info(`Started workflow execution: ${executionId}`);
    return { executionId };
  }
  
  private async executeSteps(executionId: string, stepIds: string[]): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'running') {
      return;
    }
    
    const workflow = this.workflows.get(execution.workflowId)!;
    
    for (const stepId of stepIds) {
      const step = workflow.steps.find(s => s.id === stepId);
      if (!step) {
        continue;
      }
      
      execution.currentSteps.push(stepId);
      this.executeStep(executionId, step);
    }
  }
  
  private async executeStep(executionId: string, step: WorkflowStep): Promise<void> {
    const execution = this.executions.get(executionId)!;
    
    try {
      this.logger.debug(`Executing step: ${step.name} (${step.id})`);
      
      let result: any;
      
      switch (step.type) {
        case 'task':
          result = await this.executeTaskStep(execution, step);
          break;
        
        case 'decision':
          result = await this.executeDecisionStep(execution, step);
          break;
        
        case 'parallel':
          result = await this.executeParallelStep(execution, step);
          break;
        
        case 'join':
          result = await this.executeJoinStep(execution, step);
          break;
        
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }
      
      this.eventEmitter.emit('step.completed', executionId, step.id, result);
      
    } catch (error) {
      this.eventEmitter.emit('step.failed', executionId, step.id, error);
    }
  }
  
  private async executeTaskStep(execution: WorkflowExecution, step: WorkflowStep): Promise<any> {
    const { service, method, params } = step.config;
    
    // Replace variables in params
    const resolvedParams = this.resolveVariables(params, execution.variables);
    
    // Call the service
    const response = await this.use(
      new oAddress(service),
      { method, params: resolvedParams }
    );
    
    return response.result;
  }
  
  private async executeDecisionStep(execution: WorkflowExecution, step: WorkflowStep): Promise<any> {
    const { condition, trueStep, falseStep } = step.config;
    
    // Evaluate condition
    const result = this.evaluateCondition(condition, execution.variables);
    
    return {
      decision: result,
      nextStep: result ? trueStep : falseStep
    };
  }
  
  private async executeParallelStep(execution: WorkflowExecution, step: WorkflowStep): Promise<any> {
    const { parallelSteps } = step.config;
    
    // Execute all parallel steps
    const promises = parallelSteps.map(async (stepId: string) => {
      const parallelStep = this.workflows.get(execution.workflowId)!.steps.find(s => s.id === stepId);
      if (parallelStep) {
        return await this.executeStep(execution.id, parallelStep);
      }
    });
    
    const results = await Promise.allSettled(promises);
    
    return {
      parallelResults: results.map((result, index) => ({
        stepId: parallelSteps[index],
        status: result.status,
        value: result.status === 'fulfilled' ? result.value : result.reason
      }))
    };
  }
  
  private async executeJoinStep(execution: WorkflowExecution, step: WorkflowStep): Promise<any> {
    const { waitForSteps } = step.config;
    
    // Check if all required steps are completed
    const allCompleted = waitForSteps.every((stepId: string) => 
      execution.completedSteps.includes(stepId)
    );
    
    if (!allCompleted) {
      throw new Error('Not all required steps are completed for join');
    }
    
    return { joined: true, waitedFor: waitForSteps };
  }
  
  private async handleStepCompleted(executionId: string, stepId: string, result: any): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) return;
    
    // Update execution state
    execution.currentSteps = execution.currentSteps.filter(id => id !== stepId);
    execution.completedSteps.push(stepId);
    
    // Update variables with step result
    if (result && typeof result === 'object') {
      execution.variables = { ...execution.variables, ...result };
    }
    
    // Find next steps to execute
    const workflow = this.workflows.get(execution.workflowId)!;
    const nextSteps = workflow.steps.filter(step => 
      step.dependencies.includes(stepId) &&
      step.dependencies.every(dep => execution.completedSteps.includes(dep)) &&
      !execution.completedSteps.includes(step.id) &&
      !execution.currentSteps.includes(step.id)
    );
    
    if (nextSteps.length > 0) {
      await this.executeSteps(executionId, nextSteps.map(s => s.id));
    } else if (execution.currentSteps.length === 0) {
      // No more steps to execute, workflow is complete
      execution.status = 'completed';
      execution.endTime = new Date();
      this.eventEmitter.emit('execution.completed', executionId);
    }
  }
  
  private async handleStepFailed(executionId: string, stepId: string, error: Error): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) return;
    
    // Update execution state
    execution.currentSteps = execution.currentSteps.filter(id => id !== stepId);
    execution.failedSteps.push(stepId);
    execution.status = 'failed';
    execution.endTime = new Date();
    execution.error = error.message;
    
    this.eventEmitter.emit('execution.failed', executionId, error.message);
  }
  
  private async getExecutionStatus(executionId: string): Promise<WorkflowExecution> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }
    return execution;
  }
  
  private async pauseExecution(executionId: string): Promise<{ paused: boolean }> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }
    
    execution.status = 'paused';
    return { paused: true };
  }
  
  private async resumeExecution(executionId: string): Promise<{ resumed: boolean }> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }
    
    if (execution.status === 'paused') {
      execution.status = 'running';
      // Continue with current steps if any
      if (execution.currentSteps.length > 0) {
        const workflow = this.workflows.get(execution.workflowId)!;
        const steps = workflow.steps.filter(s => execution.currentSteps.includes(s.id));
        for (const step of steps) {
          this.executeStep(executionId, step);
        }
      }
    }
    
    return { resumed: true };
  }
  
  private async cancelExecution(executionId: string): Promise<{ cancelled: boolean }> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }
    
    execution.status = 'failed';
    execution.endTime = new Date();
    execution.error = 'Cancelled by user';
    
    return { cancelled: true };
  }
  
  private validateWorkflow(workflow: WorkflowDefinition): void {
    // Basic validation
    if (!workflow.id || !workflow.name || !workflow.steps) {
      throw new Error('Invalid workflow definition');
    }
    
    // Check for circular dependencies
    // Implementation would include cycle detection algorithm
  }
  
  private resolveVariables(obj: any, variables: any): any {
    if (typeof obj === 'string') {
      return obj.replace(/\$\{(\w+)\}/g, (match, varName) => {
        return variables[varName] || match;
      });
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.resolveVariables(item, variables));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const resolved = {};
      for (const [key, value] of Object.entries(obj)) {
        resolved[key] = this.resolveVariables(value, variables);
      }
      return resolved;
    }
    
    return obj;
  }
  
  private evaluateCondition(condition: string, variables: any): boolean {
    // Simple condition evaluation
    // In production, use a proper expression evaluator
    try {
      const func = new Function('vars', `with(vars) { return ${condition}; }`);
      return func(variables);
    } catch (error) {
      this.logger.error('Condition evaluation failed:', error);
      return false;
    }
  }
  
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Usage
const workflowEngine = new WorkflowNode('o://workflow/engine');
await workflowEngine.start();

// Create a sample workflow
const sampleWorkflow: WorkflowDefinition = {
  id: 'user-onboarding',
  name: 'User Onboarding Workflow',
  description: 'Complete user onboarding process',
  variables: {
    userId: '',
    userEmail: '',
    welcomeEmailSent: false
  },
  steps: [
    {
      id: 'create-user',
      name: 'Create User Account',
      type: 'task',
      config: {
        service: 'o://services/user-service',
        method: 'users.create',
        params: {
          name: '${userName}',
          email: '${userEmail}'
        }
      },
      dependencies: []
    },
    {
      id: 'send-welcome-email',
      name: 'Send Welcome Email',
      type: 'task',
      config: {
        service: 'o://services/email-service',
        method: 'emails.send',
        params: {
          to: '${userEmail}',
          template: 'welcome',
          data: { userId: '${userId}' }
        }
      },
      dependencies: ['create-user']
    },
    {
      id: 'setup-preferences',
      name: 'Setup User Preferences',
      type: 'task',
      config: {
        service: 'o://services/preference-service',
        method: 'preferences.initialize',
        params: {
          userId: '${userId}'
        }
      },
      dependencies: ['create-user']
    }
  ]
};

// Create and execute the workflow
await workflowEngine.use(
  new oAddress('o://workflow/engine/workflow.create'),
  { method: 'workflow.create', params: { workflow: sampleWorkflow } }
);

const execution = await workflowEngine.use(
  new oAddress('o://workflow/engine/workflow.execute'),
  {
    method: 'workflow.execute',
    params: {
      workflowId: 'user-onboarding',
      variables: {
        userName: 'John Doe',
        userEmail: 'john@example.com'
      }
    }
  }
);

console.log('Workflow execution started:', execution.result.executionId);
```

These examples demonstrate the versatility and power of the Olane o-core system for building distributed, intelligent applications. Each example showcases different patterns and use cases, from simple microservices to complex workflow orchestration systems.

## Key Takeaways

1. **Modular Design** - Each node is self-contained with clear responsibilities
2. **Event-Driven Architecture** - Nodes can react to events and coordinate asynchronously  
3. **Hierarchical Organization** - Nodes can be organized in parent-child relationships
4. **Transport Abstraction** - Support for multiple communication protocols
5. **Error Handling** - Robust error propagation and recovery mechanisms
6. **Monitoring & Metrics** - Built-in observability features
7. **Scalability** - Nodes can be scaled horizontally and load balanced
8. **Extensibility** - Custom resolvers and transports can be added easily

These patterns can be combined and extended to build sophisticated distributed systems that leverage the full power of the Olane network infrastructure.
