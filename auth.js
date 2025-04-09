const { ClientSecretCredential } = require('@azure/identity');
const config = require('./config');

// Create a credential using client secret authentication
const getCredential = () => {
  return new ClientSecretCredential(
    config.azure.tenantId,
    config.azure.clientId,
    config.azure.clientSecret
  );
};

// Get access token for Microsoft Graph API
const getGraphToken = async () => {
  const credential = getCredential();
  return await credential.getToken(config.scopes.graph);
};

// Get access token for Azure Management API (used for Sentinel)
const getSentinelToken = async () => {
  const credential = getCredential();
  return await credential.getToken(config.scopes.sentinel);
};

module.exports = {
  getCredential,
  getGraphToken,
  getSentinelToken
};
