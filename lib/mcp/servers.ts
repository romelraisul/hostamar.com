// lib/mcp/servers.ts — V36.36: MCP server registry (data, not live servers).
// OpenSEO MCP + Hosta Qdrant + M3E Canvas + Understand Anything knowledge
// graph + gateway router. Wire real endpoints as they land.

export type McpServer = { name: string; url?: string; file?: string; skills: string[] };

export const MCP_SERVERS: McpServer[] = [
  { name: 'openseo', url: 'https://openseo.so/docs/mcp', skills: ['Keyword research', 'Rank tracking', 'Competitor Insights', 'Backlinks', 'Site Audits', 'AI Visibility'] },
  { name: 'hosta-qdrant', skills: ['check_server_status', 'reset_cpanel_password', 'get_invoice_status', 'bKash IPN verify'] },
  { name: 'm3e-canvas', url: 'https://lnkiai.github.io/m3e-canvas', skills: ['Desktop 1280x800', 'Phone 412x892', 'Copy Prompt'] },
  { name: 'understand-anything', file: '.understand-anything/knowledge-graph.json', skills: ['/understand', 'explain-bn', 'explain-en'] },
  { name: 'gateway-11442', skills: ['qwen-fast', 'qwen-power', 'qwen-long', 'qwen-flash-next :1919', 'hostamar-lite'] },
];
