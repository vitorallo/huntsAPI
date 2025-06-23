// sentinel-mcp-server.js
// Streamlined MCP-compliant server focusing on core hunt management

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import http from 'http';

// Helper: HTTP request to local Sentinel Integration API
function sentinelApiRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body || {});
    const options = {
      hostname: 'localhost',
      port: 3001, // Using the port from index.js (DEFAULT_PORT = 3001)
      path: `/api${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    
    
    const req = http.request(options, (res) => {
      let chunks = '';
      res.on('data', (chunk) => {
        chunks += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(chunks);
          resolve(json);
        } catch (e) {
          resolve({ error: 'Invalid JSON response from Sentinel API', details: chunks });
        }
      });
    });
    
    req.on('error', (e) => {
      console.error('API request error:', e);
      reject(e);
    });
    
    req.write(data);
    req.end();
  });
}

// MCP Server Setup
const server = new Server(
  {
    name: 'Sentinel MCP Server',
    version: '1.0.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// Tool Definitions
const TOOLS = {
  // Tool 1: create_hunt
  create_hunt: {
    name: 'create_hunt',
    description: 'Create a new hunt in Microsoft Sentinel',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Display name for the hunt' },
        description: { type: 'string', description: 'Description of the hunt' }
      },
      required: ['name']
    }
  },
  
  // Tool 2: create_query_with_hunt
  create_query_with_hunt: {
    name: 'create_query_with_hunt',
    description: 'Create a hunt with one query associated, then link them together. Tactics and techniques must be specified as strings separated by commas',
    inputSchema: {
      type: 'object',
      properties: {
        queryName: { type: 'string', description: 'Display name for the query' },
        queryDescription: { type: 'string', description: 'Description of the query' },
        queryText: { type: 'string', description: 'KQL query text in one string' },
        huntName: { type: 'string', description: 'Display name for the hunt' },
        huntDescription: { type: 'string', description: 'Description of the hunt' },
        tactics: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'MITRE ATT&CK tactics (optional) - here you need a list of tactics comma separated in one string and trim spaces between words'
        },
        techniques: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'MITRE ATT&CK techniques (optional) - here you need a list of techniques comma separated in one string'
        }
      },
      required: ['queryName', 'queryText', 'huntName']
    }
  },
  
  // Tool 3: delete_hunt
  delete_hunt: {
    name: 'delete_hunt',
    description: 'Delete a specific hunt (relations will be removed automatically)',
    inputSchema: {
      type: 'object',
      properties: {
        huntId: { type: 'string', description: 'ID of the hunt to delete' }
      },
      required: ['huntId']
    }
  },
  
  // Tool 4: run_hunting_query
  run_hunting_query: {
    name: 'run_hunting_query',
    description: 'Execute a KQL hunting query against the Sentinel workspace and get results',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'KQL query text to execute' },
        timespan: { type: 'string', description: 'Query timespan (optional, default: P1D for 1 day)' }
      },
      required: ['query']
    }
  }
};

// Resource Template Definitions
const RESOURCE_TEMPLATES = [
  {
    uriTemplate: 'sentinel://queries/{id}',
    name: 'Sentinel Query',
    description: 'A specific hunting query in Microsoft Sentinel',
    mimeType: 'application/json'
  },
  {
    uriTemplate: 'sentinel://hunts/{id}',
    name: 'Sentinel Hunt',
    description: 'A specific hunt in Microsoft Sentinel',
    mimeType: 'application/json'
  }
];

// Register ListTools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: Object.values(TOOLS)
  };
});

// Register ListResources handler
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [] // No static resources for now
  };
});

// Register ListResourceTemplates handler
server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
  return {
    resourceTemplates: RESOURCE_TEMPLATES
  };
});

// Register ReadResource handler
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  
  // Parse the URI to determine what resource is being requested
  const queriesMatch = uri.match(/^sentinel:\/\/queries\/(.+)$/);
  const huntsMatch = uri.match(/^sentinel:\/\/hunts\/(.+)$/);
  
  try {
    if (queriesMatch) {
      const queryId = queriesMatch[1];
      // Fetch the specific query from the API
      const queryData = await sentinelApiRequest(`/hunting-queries/${queryId}`, 'GET', {});
      
      return {
        contents: [
          {
            uri: uri,
            mimeType: 'application/json',
            text: JSON.stringify(queryData, null, 2)
          }
        ]
      };
    } else if (huntsMatch) {
      const huntId = huntsMatch[1];
      // Fetch the specific hunt from the API
      const huntData = await sentinelApiRequest(`/hunts/${huntId}`, 'GET', {});
      
      return {
        contents: [
          {
            uri: uri,
            mimeType: 'application/json',
            text: JSON.stringify(huntData, null, 2)
          }
        ]
      };
    } else {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Invalid resource URI: ${uri}`
      );
    }
  } catch (error) {
    console.error(`Error fetching resource ${uri}:`, error);
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to fetch resource: ${error.message}`
    );
  }
});

// Register CallTool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const args = request.params.arguments;
  
  
  try {
    switch (toolName) {
      case 'create_hunt':
        // Use the /api/hunts endpoint to create a new hunt
        const huntResult = await sentinelApiRequest('/hunts', 'POST', {
          name: args.name,
          description: args.description || ''
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Hunt created successfully:\n${JSON.stringify(huntResult, null, 2)}`
            }
          ]
        };
        
      case 'create_query_with_hunt':
        // Use the /api/bulk-create-hunt endpoint which handles creating both and linking them
        const bulkResult = await sentinelApiRequest('/bulk-create-hunt', 'POST', {
          displayName: args.queryName,
          description: args.queryDescription || '',
          query: args.queryText,
          huntName: args.huntName,
          huntDescription: args.huntDescription || '',
          tactics: args.tactics || [],
          techniques: args.techniques || []
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Query and hunt created and linked successfully:\n${JSON.stringify(bulkResult, null, 2)}`
            }
          ]
        };
        
      case 'delete_hunt':
        // Simplified approach: just delete the hunt directly
        // The system will handle cleaning up relations internally
        const deleteResult = await sentinelApiRequest(`/hunts/${args.huntId}`, 'DELETE', {});
        
        return {
          content: [
            {
              type: 'text',
              text: `Hunt deleted successfully. Any linked queries should be automatically unlinked.`
            }
          ]
        };
        
      case 'run_hunting_query':
        // Use the /api/hunting-queries/run endpoint to execute the query
        const queryResult = await sentinelApiRequest('/hunting-queries/run', 'POST', {
          query: args.query,
          timespan: args.timespan || 'P1D'
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Query executed successfully:\n${JSON.stringify(queryResult, null, 2)}`
            }
          ]
        };
        
      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${toolName}`
        );
    }
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    
    // Check if this is an API error with a response
    const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
    
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
});

// Start the MCP server (stdio)
console.error('Starting Sentinel MCP Server...');
try {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Sentinel MCP Server connected and ready');
} catch (error) {
  console.error('Failed to start MCP server:', error);
}
