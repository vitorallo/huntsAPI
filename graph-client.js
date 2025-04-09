const { Client } = require('@microsoft/microsoft-graph-client');
const { getGraphToken } = require('./auth');
const config = require('./config');

// Create a Microsoft Graph client
const getGraphClient = () => {
  return Client.init({
    authProvider: async (done) => {
      try {
        const token = await getGraphToken();
        done(null, token.token);
      } catch (error) {
        done(error, null);
      }
    }
  });
};

// Get information about the current application
const getApplicationInfo = async () => {
  const client = getGraphClient();
  
  try {
    // Get the application by its client ID
    const filter = `appId eq '${config.azure.clientId}'`;
    const result = await client.api('/applications').filter(filter).get();
    
    if (result.value && result.value.length > 0) {
      return result.value[0];
    } else {
      throw new Error('Application not found');
    }
  } catch (error) {
    console.error('Error getting application info from Graph API:', error);
    throw error;
  }
};

module.exports = {
  getGraphClient,
  getApplicationInfo
};
