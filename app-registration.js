const { getGraphClient } = require('./graph-client');
const config = require('./config');

// Register a new application in Azure AD
const registerApplication = async (appName, redirectUris = []) => {
  const client = getGraphClient();
  
  const appRegistration = {
    displayName: appName,
    signInAudience: 'AzureADMyOrg',
    web: {
      redirectUris: redirectUris,
      implicitGrantSettings: {
        enableIdTokenIssuance: true,
        enableAccessTokenIssuance: true
      }
    },
    requiredResourceAccess: [
      {
        // Microsoft Graph
        resourceAppId: '00000003-0000-0000-c000-000000000000',
        resourceAccess: [
          {
            // User.Read
            id: 'e1fe6dd8-ba31-4d61-89e7-88639da4683d',
            type: 'Scope'
          }
        ]
      }
    ]
  };

  try {
    const result = await client.api('/applications').post(appRegistration);
    console.log('Application registered successfully:', result.appId);
    return result;
  } catch (error) {
    console.error('Error registering application via Graph API:', error);
    throw error;
  }
};

// Add API permissions to the application
const addApiPermissions = async (appObjectId, permissions) => {
  const client = getGraphClient();
  
  try {
    const app = await client.api(`/applications/${appObjectId}`).get();
    
    // Add new permissions to existing ones
    const requiredResourceAccess = [
      ...(app.requiredResourceAccess || []),
      ...permissions
    ];
    
    // Update the application
    await client.api(`/applications/${appObjectId}`)
      .patch({ requiredResourceAccess });
    
    console.log(`API permissions added successfully for app object ID ${appObjectId}`);
    return true;
  } catch (error) {
    console.error(`Error adding API permissions for app object ID ${appObjectId}:`, error);
    throw error;
  }
};

// Add Microsoft Sentinel permissions
const addSentinelPermissions = async (appObjectId) => {
  // Azure Service Management API permissions for Sentinel
  const managementPermissions = {
    resourceAppId: '797f4846-ba00-4fd7-ba43-dac1f8f63013', // Azure Service Management API
    resourceAccess: [
      {
        id: '41094075-9dad-400e-a0bd-54e686782033', // user_impersonation
        type: 'Scope'
      }
    ]
  };
  
  return await addApiPermissions(appObjectId, [managementPermissions]);
};

module.exports = {
  registerApplication,
  addApiPermissions,
  addSentinelPermissions
};
