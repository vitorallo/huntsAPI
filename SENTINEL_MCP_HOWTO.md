# Sentinel MCP Server: How to Use with Claude Desktop

This guide provides high-level instructions for setting up and using the Sentinel MCP server with Claude Desktop.

## Prerequisites

- Node.js installed (v16+ recommended)
- Sentinel Integration API running locally on port 3001
- Claude Desktop app installed

## Setup

1. **Start the Sentinel Integration API**

   Ensure your Sentinel Integration API is running on port 3001:

   ```bash
   node index.js
   ```

2. **Configure Claude Desktop**

   - Open Claude Desktop
   - Go to Settings (gear icon)
   - Navigate to the "MCP Servers" section
   - Click "Add Server"
   - Fill in with the details available in the file: claude_desktop_config.json
   - Click "Save"
   - Toggle the server to "Enabled" 
   - Close and reopen Claude Desktop

## Using the MCP Server in Claude Desktop

Once configured, you can use the Sentinel MCP server in your conversations with Claude:

### Available Tools

1. **create_hunt**
   - Creates a new hunt in Microsoft Sentinel

2. **create_query_with_hunt**
   - Creates a query and a hunt, then links them together

3. **delete_hunt**
   - Deletes a specific hunt (relations will be removed automatically)

### Example Prompts

Here are some example prompts you can use with Claude:

1. **Creating a Hunt**

   ```
   Create a new hunt in Sentinel called "Suspicious PowerShell Commands" with the description "Hunting for suspicious PowerShell activity".
   ```

2. **Creating a Query with Hunt**

   ```
   Create a Sentinel query called "Failed Login Attempts" with the KQL query "SecurityEvent | where EventID == 4625" and link it to a hunt called "Brute Force Detection".
   ```

3. **Deleting a Hunt**

   ```
   Delete the Sentinel hunt with ID "12345678-1234-1234-1234-123456789012".
   ```

### Resource Templates (WORK IN PROGESS)

The server also provides resource templates for accessing specific queries and hunts.
THOSE ARE DEFINED ONLY NOT TO FAIL DEBUGGING IN THE MCP INSPECTOR --> they are not relevant

- `sentinel://queries/{id}`: Access a specific hunting query
- `sentinel://hunts/{id}`: Access a specific hunt

## Troubleshooting

- **Server Not Connecting**: Ensure the Sentinel Integration API is running on port 3001
- **Tools Not Appearing**: Restart Claude Desktop and check the server status in Settings
- **Error Messages**: Check the terminal running the MCP server for detailed error logs

## Advanced Usage

For more advanced usage and customization, refer to the source code in `sentinel-mcp-server.js`. You can extend the server with additional tools and resources as needed.
