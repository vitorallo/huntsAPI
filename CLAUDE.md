# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Microsoft Sentinel Integration API that provides an abstraction layer over Microsoft Sentinel and Azure AD APIs. The project enables streamlined management of Sentinel hunting queries and hunts through multiple interfaces: REST API, MCP server for Claude Desktop, and a Python CLI.

## Development Commands

```bash
# Install dependencies
npm install

# Start main API server (port 3001)
npm start
# or
node index.js

# Start MCP server for Claude Desktop integration
node sentinel-mcp-server.js

# Python sample CLI (requires Python environment)
cd sample/
pip install -r requirements.txt
python hunts_cli.py
```

## Architecture Overview

### Core Application Structure
- **`index.js`** - Main Express server with REST API routes
- **`config.js`** - Environment configuration management
- **`auth.js`** - Azure authentication utilities using service principal flow
- **`sentinel-client.js`** - Core Sentinel API client functions
- **`graph-client.js`** - Microsoft Graph API interactions
- **`hunting-queries.js`** - Query management business logic
- **`app-registration.js`** - Azure AD application registration utilities

### MCP Integration
- **`sentinel-mcp-server.js`** - MCP server implementation enabling Claude Desktop to create hunts, queries, and perform bulk operations
- **`claude_desktop_config.json`** - Configuration for Claude Desktop MCP integration

### Sample Python Application
Located in `sample/` directory - provides CLI interface and local database operations for hunting queries.

## Key Technical Details

### Authentication Flow
Uses Azure service principal authentication with client credentials flow. Requires AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET environment variables.

### API Architecture Pattern
The project bridges multiple Azure APIs:
- Microsoft Graph API (application management)
- Azure Management API (Sentinel workspace operations) 
- MicrosoftSecurityInsights API (hunting queries)

### Resource Management
All created resources are tagged with `CreatedBy: "huntsapi-integration"` for identification and bulk cleanup operations.

### Bulk Operations
Supports atomic operations that create hunting queries, hunts, and link them together in single API calls to ensure consistency.

## Environment Setup

Required `.env` file:
```bash
AZURE_TENANT_ID=your_tenant_id
AZURE_CLIENT_ID=your_client_id  
AZURE_CLIENT_SECRET=your_client_secret
WORKSPACE_NAME=your_workspace_name
WORKSPACE_RESOURCE_GROUP=your_resource_group
SUBSCRIPTION_ID=your_subscription_id
```

## API Endpoints Structure

- **Application Management**: `/api/register-app`, `/api/app-info`
- **Hunting Queries**: `/api/hunting-queries/*` (CRUD operations, file upload, execution)
- **Hunts Management**: `/api/hunts/*` (CRUD, linking, bulk operations)
- **Cleanup**: `/api/purge` (removes all integration-created resources)

## MCP Tools Available

When using Claude Desktop with the MCP server:
1. `create_hunt` - Create new Sentinel hunts
2. `create_query_with_hunt` - Create queries and hunts together
3. `delete_hunt` - Delete specific hunts

## File Processing

Supports both JSON input and KQL file uploads. KQL files can include metadata in comments using `// DisplayName:`, `// Description:`, `// Tactics:`, `// Techniques:` format.