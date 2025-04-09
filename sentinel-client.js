const axios = require('axios');
const { getSentinelToken } = require('./auth');
const config = require('./config');
const { v4: uuidv4 } = require("uuid");

// Create the base URL for Azure Management API requests
const getBaseUrl = () => {
  const { subscriptionId, resourceGroup, workspaceName } = config.sentinel;
  return `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.OperationalInsights/workspaces/${workspaceName}`;
};

// Get hunting queries from Microsoft Sentinel
const getHuntingQueries = async () => {
  const token = await getSentinelToken();
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/savedSearches?api-version=${config.sentinel.APIversion}`;
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token.token}`
      }
    });
    //if (response.data.length > 0) return response.data.value;
    //  else return ['No hunting queries found'];
    return response.data.value;

  } catch (error) {
    console.error('Error getting hunting queries:', error.response?.data || error.message);
    throw error;
  }
};

// get hunts
const getHunts = async (queryData) => {
  const token = await getSentinelToken();
  const baseUrl = getBaseUrl();
  const queryId = uuidv4(); // Note: This uuid seems unused for GET requests
  // Using hunts sentinel api
  const url = `${baseUrl}/providers/Microsoft.SecurityInsights/hunts?api-version=${config.sentinel.previewApiVersion}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token.token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error creating hunting:', error.response?.data || error.message);
    throw error;
  }
};

// Create a new hunting query in Microsoft Sentinel
// Constants for tags/labels
const INTEGRATION_TAG_NAME = "origin";
const INTEGRATION_TAG_VALUE = "Sentinel TH Integration";
const INTEGRATION_LABEL = "Sentinel TH Integration";
const EXTID_TAG_NAME = "extid";
const TACTICS_TAG_NAME = "tactics";
const TECHNIQUES_TAG_NAME = "techniques";
const HUNT_QUERY_CATEGORY = "Hunt Queries"; // Correct category for linking to hunts

const createHuntingQuery = async (queryData) => {
  // Helper function to truncate string to last comma within maxLength
  function truncateToLastComma(str, maxLength = 255) {
    // If the string is shorter than maxLength, return it as is
    if (str.length <= maxLength) {
      return str;
    }
  
    // Find the position of the last comma within the first 255 characters
    const truncated = str.slice(0, maxLength);
    const lastCommaIndex = truncated.lastIndexOf(',');
  
    // If there's no comma found, just truncate to maxLength
    if (lastCommaIndex === -1) {
      return truncated;
    }
  
    // Return the substring up to the last comma, trimming the comma
    return truncated.slice(0, lastCommaIndex);
  }

  const token = await getSentinelToken();
  const baseUrl = getBaseUrl();
  const queryId = uuidv4();
  const url = `${baseUrl}/savedSearches/${queryId}?api-version=${config.sentinel.APIversion}`;
  // Define start and end times (last 24 hours) - Commented out as they are not used
  //const endTime = new Date().toISOString();
  //const startTime = new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toISOString();

  // Format the query data for the API
  const apiQueryData = {
    properties: {
      category: HUNT_QUERY_CATEGORY, // Use constant
      displayName: queryData.name,
      query: queryData.query,
      status: "New",
      description: queryData.description || "",
      //queryStartTimeUtc: startTime, // Commented out as not used
      //queryEndTimeUtc: endTime, // Commented out as not used
      tags: [
        { name: INTEGRATION_TAG_NAME, value: INTEGRATION_TAG_VALUE },
        { name: EXTID_TAG_NAME, value: queryData.extid || "" }
      ]
    },
    etag: "*"
  };

  // Add tactics and techniques as tags if provided
  if (queryData.tactics && queryData.tactics.length > 0) {
    // Clean up tactics string (remove spaces, fix common typo the way MS likes it)
    const cleanedTactics = queryData.tactics.replace(/\s+/g, '').replace(/CommandandControl/g, "CommandAndControl");
    apiQueryData.properties.tags.push({
      name: TACTICS_TAG_NAME,
      value: cleanedTactics
    });
  }

  if (queryData.techniques && queryData.techniques.length > 0) {
    apiQueryData.properties.tags.push({
      name: TECHNIQUES_TAG_NAME,
      value: truncateToLastComma(queryData.techniques) // Apply truncation logic
    });
  }

  try {
    const response = await axios.put(url, apiQueryData, {
      headers: {
        Authorization: `Bearer ${token.token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error creating hunting query:', error.response?.data || error.message);
    throw error;
  }
};

// Create a new hunting query in Microsoft Sentinel
const createHunt = async (queryData) => {
  const token = await getSentinelToken();
  const baseUrl = getBaseUrl();
  const queryId = uuidv4();
  // Using hunts sentinel api with preview version
  const url = `${baseUrl}/providers/Microsoft.SecurityInsights/hunts/${queryId}?api-version=${config.sentinel.previewApiVersion}`;

  // Format the query data for the API
  const apiQueryData = {
    properties: {
      displayName: queryData.name,
      description: queryData.description || "",
      //queryStartTimeUtc: startTime, // Commented out as not used
      //queryEndTimeUtc: endTime, // Commented out as not used
      status: "New",
      labels: [INTEGRATION_LABEL] // Use constant
    },
//    etag: "*" // Etag is generally not needed for creation
  };

  try {
    const response = await axios.put(url, apiQueryData, {
      headers: {
        Authorization: `Bearer ${token.token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error creating hunting:', error.response?.data || error.message);
    throw error;
  }
};

// Link an existing hunting to a hunt
const linkQuery = async (queryData) => {
  const token = await getSentinelToken();
  const baseUrl = getBaseUrl();
  const relationId = uuidv4(); // Use a more descriptive name
  const huntId = queryData.huntId;
  const url = `${baseUrl}/providers/Microsoft.SecurityInsights/hunts/${huntId}/relations/${relationId}?api-version=${config.sentinel.previewApiVersion}`;
  // Format the query data for the API
  const apiQueryData = {
    properties: {
      relatedResourceId: queryData.queryResourceId,
      relatedResourceType: "Microsoft.OperationalInsights/savedSearches",
      labels: [INTEGRATION_LABEL] // Use constant
      //description: "This query is used for threat hunting." // Optional description
    }
  //    etag: "*" // Etag is generally not needed for creation
  };
  try {
    const response = await axios.put(url, apiQueryData, {
      headers: {
        Authorization: `Bearer ${token.token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error creating hunting:', error.response?.data || error.message);
    throw error;
  }
};

// Run a hunting query and get results
// Use a specific API version for Log Analytics query API
const LOG_ANALYTICS_API_VERSION = '2021-12-01-preview'; // Or a stable version like '2020-08-01' if preferred

const runHuntingQuery = async (query, timespan = 'P1D') => {
  const token = await getSentinelToken();
  const { subscriptionId, resourceGroup, workspaceName } = config.sentinel;

  // Using the Log Analytics query API
  const url = `https://management.azure.com/subscriptions/${subscriptionId}/resourcegroups/${resourceGroup}/providers/Microsoft.OperationalInsights/workspaces/${workspaceName}/query?api-version=${LOG_ANALYTICS_API_VERSION}`;

  const requestBody = {
    query: query,
    timespan: timespan
  };

  try {
    const response = await axios.post(url, requestBody, {
      headers: {
        Authorization: `Bearer ${token.token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error running hunting query:', error.response?.data || error.message);
    throw error;
  }
};

// Function to delete a specific hunting query
const deleteHuntingQuery = async (id) => {
  const token = await getSentinelToken();
  const baseUrl = getBaseUrl();
  const deleteUrl = `${baseUrl}/savedSearches/${id}?api-version=${config.sentinel.APIversion}`;

  try {
    await axios.delete(deleteUrl, {
      headers: {
        Authorization: `Bearer ${token.token}`
      }
    });
    console.log(`Deleted: ${id}`);
  } catch (error) {
    console.error(`Error deleting ${id}:`, error.response?.data || error.message);
  }
};

// Function to delete a specific hunt
const deleteHunt = async (huntId) => {
  const token = await getSentinelToken();
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/providers/Microsoft.SecurityInsights/hunts/${huntId}?api-version=${config.sentinel.previewApiVersion}`;
  try {
    await axios.delete(url, {
      headers: {
        Authorization: `Bearer ${token.token}`
      }
    });
    console.log(`Deleted: ${huntId}`);
  } catch (error) {
    console.error(`Error deleting ${huntId}:`, error.response?.data || error.message);
  }
};

// Function to delete a specific hunt
const deleteRelation = async (huntId, relationId) => {
  const token = await getSentinelToken();
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/providers/Microsoft.SecurityInsights/hunts/${huntId}/relations/${relationId}?api-version=${config.sentinel.previewApiVersion}`;
  try {
    await axios.delete(url, {
      headers: {
        Authorization: `Bearer ${token.token}`
      }
    });
    console.log(`Deleted relation: ${relationId}`);
  } catch (error) {
    console.error(`Error deleting relation ${relationId}:`, error.response?.data || error.message);
  }
};

// Function to get and delete queries based on the "origin" tag
const cleanupHuntingQueries = async () => {
  try {
    const queries = await getHuntingQueries();
    if (!queries || queries.length === 0) {
      console.log("No hunting queries found.");
      return ({message: "No hunting queries found."});
    }
    //select only the queries with the "origin" tag
    const toDelete = queries.filter(q => {
      // Ensure properties and tags exist
      if (!q.properties?.tags) return false;
      // Find the origin tag
      const originTag = q.properties.tags.find(tag => tag.name === INTEGRATION_TAG_NAME);
      // Check if origin tag exists and matches the value
      return originTag?.value === INTEGRATION_TAG_VALUE;
    });
    if (toDelete.length === 0) {
      console.log(`No queries found with tag ${INTEGRATION_TAG_NAME}=${INTEGRATION_TAG_VALUE}.`);
      return ({message: "No matching queries found for deletion."});
    }
    console.log(`Found ${toDelete.length} queries to delete.`);
    // Iterate and delete each matching query
    let i = 0;
    for (const query of toDelete) {
      await deleteHuntingQuery(query.name); // Delete by name
      i++;
      console.log(`Deleted query ${i}/${toDelete.length}: ${query.name}`);
    }
    return ({message: `Deleted ${i}/${toDelete.length} queries.`});
  } catch (error) {
    console.error("Error fetching hunting queries:", error.response?.data || error.message);
  }
};

// Function to get and delete queries based on the "origin" tag
const cleanupRelations = async (huntId) => {
  const token = await getSentinelToken();
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/providers/Microsoft.SecurityInsights/hunts/${huntId}/relations?api-version=${config.sentinel.previewApiVersion}`;
  // get the relations for that specific hunt
  try {
    const query = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token.token}`,
        'Content-Type': 'application/json'
      }
    });
    const response = query.data.value;
    if (!response || response.length === 0) {
      console.log("No relations for ? found.", huntId);
      return ({message: "No relations for the hunt found."});
    }
    const toDelete = response.filter(q => {
      // Ensure the labels array exists and contains the integration label
      return q.properties?.labels?.includes(INTEGRATION_LABEL);
    });
    //console.log("Relations to delete:", toDelete);
    if (toDelete.length === 0) {
      console.log(`No relations found with label ${INTEGRATION_LABEL} for hunt ${huntId}.`);
      return ({message: `No relations found with label ${INTEGRATION_LABEL} for hunt ${huntId}.`});
    }
    console.log(`Found ${toDelete.length} relations to delete for hunt ${huntId}.`);
    // Iterate and delete each matching relation
    let i = 0;
    for (const relation of toDelete) {
      await deleteRelation(huntId, relation.name); // Delete by name (contains the guid)
      i++;
      console.log(`Deleted relation ${i}/${toDelete.length}: ${relation.name}`);
    }
    return (i);
  } catch (error) {
    console.error("Error fetching relations related to hunt:", error.response?.data || error.message);
  }
};

const cleanupHunts = async () => {
  const token = await getSentinelToken();
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/providers/Microsoft.SecurityInsights/hunts?api-version=${config.sentinel.previewApiVersion}`;
  // get the list of hunts
  try {
    const query = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token.token}`,
        'Content-Type': 'application/json'
        }
      });
    const response = query.data.value;
    if (!response || response.length === 0) {
      console.log("No hunts found.");
      return ({message: "No hunts found."});
    }
    //filter on the label
    //console.log("Fetched hunts:", JSON.stringify(response, null, 2));
    const toDelete = response.filter(q => {
      // Ensure the labels array exists and contains the integration label
      return q.properties?.labels?.includes(INTEGRATION_LABEL);
    });

    if (toDelete.length === 0) {
      console.log(`No hunts found with label ${INTEGRATION_LABEL}.`);
      return ({message: `No hunts found with label ${INTEGRATION_LABEL}.`});
    }

    console.log(`Found ${toDelete.length} hunts to delete.`);

    // Iterate and delete each matching query
    let i = 0;
    let r = 0
    for (const query of toDelete) {
      r = r + await cleanupRelations(query.name); // Delete relations
      await deleteHunt(query.name); // Delete by name
      i++;
      console.log(`Deleted ${r} relations for hunt ${query.name}`);
      console.log(`Deleted hunt ${i}/${toDelete.length}: ${query.properties.displayName} (${query.name})`);
    }

    return ({message: `Deleted ${i}/${toDelete.length} hunts and ${r} relations.`});

  } catch (error) {
    console.error("Error during hunt cleanup:", error.response?.data || error.message);
  }
};

module.exports = {
  getHuntingQueries,
  createHuntingQuery,
  createHunt,
  linkQuery,
  cleanupHuntingQueries,
  cleanupHunts,
  runHuntingQuery,
  getHunts
};
