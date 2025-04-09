require('dotenv').config();

module.exports = {
  azure: {
    tenantId: process.env.AZURE_TENANT_ID,
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET
  },
  sentinel: {
    workspaceName: process.env.WORKSPACE_NAME,
    workspaceId: process.env.WORKSPACE_ID,
    resourceGroup: process.env.WORKSPACE_RESOURCE_GROUP,
    subscriptionId: process.env.SUBSCRIPTION_ID,
    APIversion: process.env.API_VERSION || '2022-11-01', // Default if not set in .env
    previewApiVersion: '2025-01-01-preview' // Specific version for Hunts/Relations
  },
  scopes: {
    graph: ['https://graph.microsoft.com/.default'],
    sentinel: ['https://management.azure.com/.default']
  }
};
