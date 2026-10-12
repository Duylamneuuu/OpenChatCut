import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { CodexToolResultRequest, CodexTurnRequest, CodexTurnStreamEvent } from '../../shared/codex-agent';

const requests = new Map<string, Map<string, (result: CodexToolResultRequest) => void>>();
export function settleCliToolResult(result: CodexToolResultRequest): void {
  requests.get(result.requestId)?.get(result.callId)?.(result);
}

export function cliMcpResult(result: CodexToolResultRequest) {
  const value = result.result && typeof result.result === 'object'
    ? result.result as Record<string, unknown> : null;
  const images = Array.isArray(value?.__images) ? value.__images : [];
  const content: Array<{ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string }> = [];
  for (const image of images) {
    if (image && typeof image === 'object' && typeof image.base64 === 'string') {
      content.push({ type: 'image', data: image.base64, mimeType: 'image/jpeg' });
    }
  }
  const textValue = value && images.length ? { ...value, __images: undefined } : result.result;
  content.push({ type: 'text', text: JSON.stringify(textValue ?? null) });
  return { isError: !result.success, content };
}

/** Per-turn MCP bridge: the same gated browser tools used by Codex execute once. */
export async function startCliToolBridge(
  request: CodexTurnRequest,
  emit: (event: CodexTurnStreamEvent) => void,
  signal: AbortSignal,
) {
  if (requests.has(request.requestId)) throw new Error('CLI requestId is already active.');
  const pending = new Map<string, (result: CodexToolResultRequest) => void>();
  requests.set(request.requestId, pending);
  const token = randomUUID();
  const connections = new Set<Server>();
  const server = createServer((req, res) => {
    if (req.url !== '/mcp' || req.headers.authorization !== `Bearer ${token}`) {
      res.writeHead(401).end(); return;
    }
    const mcp = new Server({ name: 'openchatcut', version: '1.0.0' }, { capabilities: { tools: {} } });
    connections.add(mcp);
    mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: request.tools.map((tool) => ({
        name: tool.name, description: tool.description,
        inputSchema: { ...tool.inputSchema, type: 'object' as const },
      })),
    }));
    mcp.setRequestHandler(CallToolRequestSchema, async (call) => {
      const name = call.params.name;
      if (signal.aborted || !request.tools.some((tool) => tool.name === name)) {
        return { isError: true, content: [{ type: 'text' as const, text: 'Tool is unavailable in this turn.' }] };
      }
      const callId = randomUUID();
      const args = call.params.arguments ?? {};
      const result = await new Promise<CodexToolResultRequest>((resolve) => {
        pending.set(callId, resolve);
        emit({ type: 'tool-start', callId, name, args });
      });
      pending.delete(callId);
      emit({ type: 'tool-end', callId, name, args, result: result.result, success: result.success });
      return cliMcpResult(result);
    });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => { connections.delete(mcp); void mcp.close().catch(() => {}); });
    void mcp.connect(transport).then(() => transport.handleRequest(req, res)).catch(() => {
      if (!res.headersSent) res.writeHead(500).end();
    });
  });
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
  } catch (error) { requests.delete(request.requestId); throw error; }
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('CLI tool bridge has no address.');
  const cancelPending = () => {
    for (const [callId, resolve] of pending) resolve({
      requestId: request.requestId, callId, success: false, result: { error: 'CLI turn stopped.' },
    });
    pending.clear();
  };
  signal.addEventListener('abort', cancelPending, { once: true });
  return {
    url: `http://127.0.0.1:${address.port}/mcp`, token,
    async close() {
      signal.removeEventListener('abort', cancelPending);
      cancelPending(); requests.delete(request.requestId);
      await Promise.all([...connections].map((mcp) => mcp.close().catch(() => {})));
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
