const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createQueryFromFile, createQueryFromInput, createSentinelHunt, linkQueryToHunt, createHuntWithQuery, purgeSentinel } = require('./hunting-queries');
const { getHuntingQueries, runHuntingQuery, getHunts } = require('./sentinel-client');
const { getApplicationInfo } = require('./graph-client');
const { registerApplication, addSentinelPermissions } = require('./app-registration');

// --- Constants ---
const UPLOADS_DIR = 'uploads';
const KQL_EXTENSION = '.kql';
const DEFAULT_APP_NAME = 'Sentinel TH Integration App';
const DEFAULT_PORT = 3001;

// --- Helper Functions ---

// Standardized error response
const sendErrorResponse = (res, error, statusCode = 500, context = 'Error') => {
  console.error(`${context}:`, error.response?.data || error.message || error);
  // Avoid sending detailed internal errors to the client unless necessary
  const clientMessage = error.response?.data?.error?.message || error.message || 'An internal server error occurred.';
  res.status(statusCode).json({ error: clientMessage });
};

// --- Express App Setup ---
const app = express();
app.use(express.json());

// Configure multer for KQL file uploads
const upload = multer({
  dest: UPLOADS_DIR,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== KQL_EXTENSION) {
      return cb(new Error(`Only ${KQL_EXTENSION} files are allowed`));
    }
    cb(null, true);
  }
});

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

// --- API Routes ---

// Register a new application
// Note: This is obsolete, better to register the app manually in Azure AD
app.post('/api/register-app', async (req, res) => {
  const context = 'Registering application';
  try {
    const { appName, redirectUris } = req.body;
    // Use default name if not provided
    const effectiveAppName = appName || DEFAULT_APP_NAME;

    console.log(`${context}: Registering app "${effectiveAppName}"...`);
    const app = await registerApplication(effectiveAppName, redirectUris || []);
    console.log(`${context}: App registered with ID ${app.appId}, adding Sentinel permissions...`);
    await addSentinelPermissions(app.id);
    console.log(`${context}: Permissions added for object ID ${app.id}.`);

    res.status(201).json({
      message: 'Application registered and permissions added successfully',
      appId: app.appId,
      objectId: app.id,
      displayName: app.displayName
    });
  } catch (error) {
    sendErrorResponse(res, error, 500, context);
  }
});

// Get application info
app.get('/api/app-info', async (req, res) => {
  try {
    const appInfo = await getApplicationInfo();
    res.json(appInfo);
  } catch (error) {
    sendErrorResponse(res, error, 500, 'Getting app info');
  }
});

// Get all hunting queries
app.get('/api/hunting-queries', async (req, res) => {
  try {
    const queries = await getHuntingQueries();
    res.json(queries);
  } catch (error) {
    sendErrorResponse(res, error, 500, 'Getting hunting queries');
  }
});

// Get all hunts
app.get('/api/hunts', async (req, res) => {
  try {
    const hunts = await getHunts();
    res.json(hunts);
  } catch (error) {
    sendErrorResponse(res, error, 500, 'Getting hunts');
  }
});

// Create a hunting query from direct input
app.post('/api/hunting-queries', async (req, res) => {
  try {
    const result = await createQueryFromInput(req.body);
    res.status(201).json(result);
  } catch (error) {
    sendErrorResponse(res, error, 500, 'Creating hunting query from input');
  }
});

// Create new sentinel hunt
app.post('/api/hunts', async (req, res) => {
  try {
    const result = await createSentinelHunt(req.body);
    res.status(201).json(result);
  } catch (error) {
    sendErrorResponse(res, error, 500, 'Creating sentinel hunt');
  }
});

// Create new link query to a hunt
app.post('/api/link-query', async (req, res) => {
  try {
    const result = await linkQueryToHunt(req.body);
    res.status(201).json(result);
  } catch (error) {
    sendErrorResponse(res, error, 500, 'Linking query to hunt');
  }
});

// Create hunt with one query in bulk
app.post('/api/bulk-create-hunt', async (req, res) => {
  try {
    const result = await createHuntWithQuery(req.body);
    res.status(201).json(result);
  } catch (error) {
    sendErrorResponse(res, error, 500, 'Bulk creating hunt and query');
  }
});

app.delete('/api/purge', async (req, res) => {
  const context = 'Purging Sentinel resources';
  try {
    const result = await purgeSentinel();
    if (result.queryCleanup?.error || result.huntCleanup?.error) {
        console.warn(`${context}: Purge completed with errors.`, result);
        res.status(207).json(result);
    } else {
        console.log(`${context}: Purge completed successfully.`);
        res.status(200).json(result);
    }
  } catch (error) {
    sendErrorResponse(res, error, 500, context);
  }
});

// Upload and create a hunting query from a KQL file
app.post('/api/hunting-queries/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const result = await createQueryFromFile(req.file.path);
    
    // Clean up the uploaded file
    fs.unlinkSync(req.file.path);
    
    res.status(201).json(result);
  } catch (error) {
    const context = 'Processing uploaded KQL file';
    console.error(`${context}:`, error); // Log the detailed error

    // Attempt cleanup even if processing failed
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log(`${context}: Cleaned up temporary file ${req.file.path}`);
      } catch (cleanupError) {
        console.error(`${context}: Failed to clean up temporary file ${req.file?.path}:`, cleanupError);
      }
    }

    sendErrorResponse(res, error, 500, context);
  }
});

// Run a hunting query
app.post('/api/hunting-queries/run', async (req, res) => {
  try {
    const { query, timespan } = req.body;
    
    // Enhanced query validation
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    if (typeof query !== 'string' || query.trim() === '') {
      return res.status(400).json({ error: 'Query must be a non-empty string' });
    }
    
    // Basic KQL syntax validation (written by AI, I don't response for any hallucinations)
    const trimmedQuery = query.trim();
    if (!trimmedQuery.match(/^[a-zA-Z_][a-zA-Z0-9_]*/) && !trimmedQuery.match(/^[a-zA-Z_][a-zA-Z0-9_]*\s*\|/)) {
      return res.status(400).json({ error: 'Query appears to have invalid KQL syntax. Must start with a table name or data source.' });
    }
    
    // Validate timespan format if provided
    if (timespan && typeof timespan === 'string') {
      // Basic ISO 8601 duration validation (P[n]Y[n]M[n]DT[n]H[n]M[n]S or simple formats like P1D)
      if (!timespan.match(/^P(\d+Y)?(\d+M)?(\d+D)?(T(\d+H)?(\d+M)?(\d+S)?)?$/) && !timespan.match(/^P\d+[DWMY]$/)) {
        return res.status(400).json({ error: 'Invalid timespan format. Use ISO 8601 duration format (e.g., P1D, PT1H, P7D)' });
      }
    }
    
    const result = await runHuntingQuery(query, timespan);
    res.json(result);
  } catch (error) {
    sendErrorResponse(res, error, 500, 'Running hunting query');
  }
});

// Start the server
const PORT = process.env.PORT || DEFAULT_PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
