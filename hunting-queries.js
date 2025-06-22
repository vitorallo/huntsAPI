const fs = require('fs');
const path = require('path');
const { createHuntingQuery, linkQuery, createHunt, cleanupHuntingQueries, cleanupHunts, runHuntingQuery } = require('./sentinel-client');


/**
 * Parses a KQL file to extract metadata and the query itself.
 * Metadata is expected in comments like: // Key: Value
 * The query is expected after a line containing: // Query:
 * @param {string} filePath - Path to the KQL file.
 * @returns {object} Object containing name, description, tactics, techniques, and query.
 */
const parseKqlFile = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const metadata = {};
  let queryLines = [];
  let inMetadata = false;
  let inQuery = false;
  
  for (const line of lines) {
    if (line.trim() === '// Metadata:') {
      inMetadata = true;
      inQuery = false;
      continue;
    } else if (line.trim() === '// Query:') {
      inMetadata = false;
      inQuery = true;
      continue;
    }
    
    if (inMetadata) {
      const match = line.match(/\/\/\s*(\w+):\s*(.*)/);
      if (match) {
        const [, key, value] = match;
        if (key === 'Tactics' || key === 'Techniques') {
          metadata[key.toLowerCase()] = value.split(',').map(item => item.trim());
        } else {
          metadata[key.toLowerCase()] = value.trim();
        }
      }
    } else if (inQuery) {
      queryLines.push(line);
    }
  }

  return {
    name: metadata.name || path.basename(filePath, '.kql'), // Use filename if name metadata is missing
    description: metadata.description || '',
    tactics: metadata.tactics || [],
    techniques: metadata.techniques || [],
    query: queryLines.join('\n').trim()
  };
};

/**
 * Creates a Sentinel hunting query using data parsed from a KQL file.
 * @param {string} filePath - Path to the KQL file.
 * @returns {Promise<object>} The result from the Sentinel API.
 */
const createQueryFromFile = async (filePath) => {
  try {
    const queryData = parseKqlFile(filePath);
    return await createHuntingQuery(queryData);
  } catch (error) {
    console.error(`Error creating query from file ${filePath}:`, error);
    throw error;
  }
};

/**
 * Creates a Sentinel hunting query using data provided directly as an object.
 * @param {object} queryData - Object containing name, description, query, tactics, techniques.
 * @returns {Promise<object>} The result from the Sentinel API.
 */
const createQueryFromInput = async (queryData) => {
  try {
    return await createHuntingQuery(queryData);
  } catch (error) {
    console.error('Error creating query from input:', error);
    throw error;
  }
};

/**
 * Creates a Sentinel hunt using data provided directly as an object.
 * @param {object} queryData - Object containing name, description.
 * @returns {Promise<object>} The result from the Sentinel API.
 */
const createSentinelHunt = async (queryData) => {
  try {
    return await createHunt(queryData);
  } catch (error) {
    console.error('Error creating hunt from input:', error);
    throw error;
  }
};

/**
 * Links an existing Sentinel query to an existing Sentinel hunt.
 * @param {object} queryData - Object containing huntId and queryResourceId.
 * @returns {Promise<object>} The result from the Sentinel API.
 */
const linkQueryToHunt = async (queryData) => {
  try {
    return await linkQuery(queryData);
  } catch (error) {
    console.error('Error linking query input:', error);
    throw error;
  }
};

/**
 * Attempts to clean up Sentinel resources (queries, relations, hunts)
 * created by this integration (identified by tag/label).
 * Tries to clean both queries and hunts even if one fails.
 * @returns {Promise<object>} An object containing results/errors from both cleanup operations.
 */
const purgeSentinel = async () => {
  let queryCleanupResult = null;
  let huntCleanupResult = null;
  let queryError = null;
  let huntError = null;

  console.log("Attempting to clean up hunting queries...");
  try {
    queryCleanupResult = await cleanupHuntingQueries();
    console.log("Query cleanup result:", queryCleanupResult);
  } catch (error) {
    console.error('Error during query cleanup:', error);
    queryError = error.message || error;
  }

  console.log("Attempting to clean up hunts and relations...");
  try {
    huntCleanupResult = await cleanupHunts();
    console.log("Hunt cleanup result:", huntCleanupResult);
  } catch (error) {
    console.error('Error during hunt cleanup:', error);
    huntError = error.message || error;
  }

  return {
    queryCleanup: queryCleanupResult || { error: queryError },
    huntCleanup: huntCleanupResult || { error: huntError }
  };
};

/**
 * Executes a KQL hunting query against the Sentinel workspace.
 * @param {string} query - The KQL query to execute.
 * @param {string} timespan - Optional timespan (default: 'P1D' for 1 day).
 * @returns {Promise<object>} The query results from the Sentinel API.
 */
const runQuery = async (query, timespan = 'P1D') => {
  try {
    if (!query || typeof query !== 'string' || query.trim() === '') {
      throw new Error('Query parameter is required and must be a non-empty string');
    }
    return await runHuntingQuery(query, timespan);
  } catch (error) {
    console.error('Error running query:', error);
    throw error;
  }
};

/**
 * Creates a Sentinel hunt and a corresponding query, then links them together.
 * @param {object} queryData - Object containing details for both the query and the hunt.
 *   Expected properties: query, displayName, description, huntName, huntDescription, tactics, techniques.
 * @returns {Promise<object>} The result of the link operation from the Sentinel API.
 */
const createHuntWithQuery = async (queryData) => {
  // Extract data for clarity
  const {
    query: queryKQL,
    displayName,
    description,
    huntName,
    huntDescription,
    tactics = [], // Default to empty array if not provided
    techniques = [] // Default to empty array if not provided
  } = queryData;

  // Validate required fields
  if (!queryKQL || !displayName || !huntName) {
      throw new Error("Missing required fields for bulk create: query, displayName, huntName");
  }

  try {
    // 1. Create the query
    console.log(`Creating query: ${displayName}`);
    const query = await createHuntingQuery({
        name: displayName,
        description: description, // Use provided description or default empty string
        query: queryKQL,
        tactics: tactics,
        techniques: techniques
    });
    console.log(`Query created: ${query.id}`);

    // 2. Create the hunt
    console.log(`Creating hunt: ${huntName}`);
    const hunt = await createHunt({
      name: huntName,
      description: huntDescription || '', // Use provided description or default empty string
    });
    console.log(`Hunt created: ${hunt.name}`); // Hunt ID is in hunt.name

    // 3. Link query to hunt
    console.log(`Linking query ${query.id} to hunt ${hunt.name}`);
    const linkResult = await linkQuery({
      huntId: hunt.name, // Use the hunt's name (which is its ID)
      queryResourceId: query.id // Use the query's full resource ID
    });
    console.log(`Link created: ${linkResult.name}`);

    return linkResult; // Return the result of the final link operation

  } catch (error) {
    // Add more context to the error
    console.error('Error during bulk create hunt and query:', error.response?.data || error.message);
    // Consider cleanup logic here? If query is created but hunt fails, should query be deleted?
    // For now, just rethrow the error.
    throw new Error(`Bulk create failed: ${error.message}`);
  }
};

module.exports = {
  parseKqlFile,
  createQueryFromFile,
  createSentinelHunt,
  createQueryFromInput,
  createHuntWithQuery,
  purgeSentinel,
  linkQueryToHunt,
  runQuery
};
