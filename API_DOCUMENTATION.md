# Sentinel Integration API Documentation

This document provides detailed information about the API endpoints offered by the Sentinel Integration application.

---

## Sample Python CLI Application

A sample Python CLI tool for managing hunts and queries locally is included in the [`sample/`](sample/) directory.

See the detailed [Sample CLI README](sample/README.md) for setup instructions and usage examples.

---

**Base URL:** `http://localhost:3001` (or port specified by `PORT` environment variable)

## Authentication & Authorization

*   The API uses Azure AD client credentials flow for authentication against Azure Management and Microsoft Graph APIs.
*   Credentials (`AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`) must be configured in the `.env` file.
*   Appropriate API permissions and RBAC roles must be granted to the application's service principal as detailed in the `README.md`.

## Configuration

Ensure the following environment variables are set in a `.env` file:

```dotenv
# Azure AD App Registration details (used for authentication)
AZURE_TENANT_ID=your_tenant_id
AZURE_CLIENT_ID=your_client_id
AZURE_CLIENT_SECRET=your_client_secret

# Microsoft Sentinel Workspace details
WORKSPACE_NAME=your_workspace_name
WORKSPACE_ID=your_workspace_id # Optional, currently unused
WORKSPACE_RESOURCE_GROUP=your_resource_group
SUBSCRIPTION_ID=your_subscription_id
# API_VERSION=2022-11-01 # Optional: Default Azure Management API version
```

---

## API Endpoints

### Application Management

#### 1. Register Application

*   **Endpoint:** `POST /api/register-app`
*   **Description:** Registers a new application in Azure AD using the provided details (or defaults) and assigns necessary Sentinel API permissions (`user_impersonation` for Azure Service Management). **Requires the service principal running this API to have app creation privileges in Azure AD.**
*   **Request Body (Optional, `application/json`):**
    ```json
    {
      "appName": "Your Custom App Name",
      "redirectUris": ["http://localhost/callback1", "https://your-app.com/auth"]
    }
    ```
    *   `appName` (string, optional): Display name for the new application. Defaults to "Sentinel TH Integration App".
    *   `redirectUris` (array of strings, optional): List of redirect URIs for the web platform. Defaults to an empty array.
*   **Success Response (201 Created):**
    ```json
    {
      "message": "Application registered and permissions added successfully",
      "appId": "new-app-client-id",
      "objectId": "new-app-object-id",
      "displayName": "Actual App Name Used"
    }
    ```
*   **Error Responses:**
    *   `4xx/5xx`: `{ "error": "Error message description" }` (e.g., insufficient privileges, invalid input, Graph API error)

#### 2. Get Application Info

*   **Endpoint:** `GET /api/app-info`
*   **Description:** Retrieves details about the application registration specified by `AZURE_CLIENT_ID` in the `.env` file from Azure AD.
*   **Request Body:** None
*   **Success Response (200 OK):**
    *   Returns the Azure AD application object. Example structure:
    ```json
    {
      "id": "object-id-from-env",
      "appId": "client-id-from-env",
      "displayName": "App Display Name",
      "signInAudience": "AzureADMyOrg",
      "requiredResourceAccess": [ /* ... permissions ... */ ],
      "web": { /* ... web settings ... */ },
      // ... other application properties
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: `{ "error": "Application not found" }`
    *   `5xx`: `{ "error": "Error message description" }` (e.g., Graph API error)

---

### Sentinel Hunting Queries

#### 3. List Hunting Queries

*   **Endpoint:** `GET /api/hunting-queries`
*   **Description:** Lists all saved searches (which include hunting queries) within the configured Sentinel workspace.
*   **Request Body:** None
*   **Success Response (200 OK):**
    *   Returns an array of saved search objects.
    ```json
    [
      {
        "id": "/subscriptions/.../savedSearches/guid",
        "name": "guid",
        "type": "Microsoft.OperationalInsights/workspaces/savedSearches",
        "etag": "...",
        "properties": {
          "category": "Hunt Queries", // or other categories
          "displayName": "Query Display Name",
          "query": "KQL Query Text",
          "description": "...",
          "tags": [ { "name": "origin", "value": "Sentinel TH Integration" }, /* ... */ ]
          // ... other properties
        }
      },
      // ... more queries
    ]
    ```
*   **Error Responses:**
    *   `5xx`: `{ "error": "Error message description" }` (e.g., Azure API error)

#### 4. Create Hunting Query (JSON)

*   **Endpoint:** `POST /api/hunting-queries`
*   **Description:** Creates a new saved search (hunting query) in Sentinel using the provided JSON data.
*   **Request Body (`application/json`):**
    ```json
    {
      "name": "My New Query via JSON",
      "description": "Detects specific logon types.",
      "query": "SecurityEvent | where EventID == 4625",
      "tactics": ["InitialAccess", "Persistence"],
      "techniques": ["T1078", "T1547"],
      "extid": "optional-external-id-123"
    }
    ```
    *   `name` (string, required): Display name for the query.
    *   `query` (string, required): The KQL query text.
    *   `description` (string, optional): Description for the query.
    *   `tactics` (string, optional): Comma-separated or single string of MITRE ATT&CK tactics.
    *   `techniques` (string, optional): Comma-separated or single string of MITRE ATT&CK techniques (will be truncated if too long).
    *   `extid` (string, optional): An external identifier stored as a tag.
*   **Success Response (201 Created):**
    *   Returns the created saved search object (similar structure to GET response).
*   **Error Responses:**
    *   `4xx/5xx`: `{ "error": "Error message description" }` (e.g., invalid input, Azure API error)

#### 5. Create Hunting Query (File Upload)

*   **Endpoint:** `POST /api/hunting-queries/upload`
*   **Description:** Creates a new saved search (hunting query) in Sentinel by parsing metadata and query from an uploaded `.kql` file.
*   **Request Body (`multipart/form-data`):**
    *   Must include a file field named `file` containing the `.kql` file.
    *   See `README.md` for the expected KQL file format.
*   **Success Response (201 Created):**
    *   Returns the created saved search object (similar structure to GET response).
*   **Error Responses:**
    *   `400 Bad Request`: `{ "error": "No file uploaded" }` or `{ "error": "Only .kql files are allowed" }` or if metadata parsing fails (e.g., missing Name).
    *   `5xx`: `{ "error": "Error message description" }` (e.g., file system error, Azure API error)

#### 6. Run Hunting Query

*   **Endpoint:** `POST /api/hunting-queries/run`
*   **Description:** Executes a given KQL query against the configured Log Analytics workspace using the Azure Log Analytics API.
*   **Request Body (`application/json`):**
    ```json
    {
      "query": "SecurityEvent | count",
      "timespan": "P7D"
    }
    ```
*   **Example Requests:**
    ```json
    // Basic query with default timespan (1 day)
    {
      "query": "Heartbeat | count"
    }
    
    // Security events in last hour
    {
      "query": "SecurityEvent | where TimeGenerated > ago(1h) | take 10",
      "timespan": "P1D"
    }
    
    // Failed logins analysis
    {
      "query": "SigninLogs | where ResultType != 0 | summarize FailedLogins = count() by UserPrincipalName | order by FailedLogins desc",
      "timespan": "PT6H"
    }
    
    // Network connections summary
    {
      "query": "CommonSecurityLog | where DeviceVendor == 'Palo Alto Networks' | summarize count() by DestinationIP",
      "timespan": "P7D"
    }
    ```
    *   `query` (string, required): The KQL query to execute. Must be a non-empty string and should start with a valid table name or data source.
    *   `timespan` (string, optional): The time range for the query in ISO 8601 duration format (e.g., `P1D`, `P7D`, `PT1H`, `P30D`). Defaults to `P1D` (1 day).
*   **Success Response (200 OK):**
    *   Returns the results from the Log Analytics query API.
    ```json
    {
      "tables": [
        {
          "name": "PrimaryResult",
          "columns": [ { "name": "Count", "type": "long" } ],
          "rows": [ [ 12345 ] ]
        }
      ]
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: 
        - `{ "error": "Query is required" }`
        - `{ "error": "Query must be a non-empty string" }`
        - `{ "error": "Query appears to have invalid KQL syntax. Must start with a table name or data source." }`
        - `{ "error": "Invalid timespan format. Use ISO 8601 duration format (e.g., P1D, PT1H, P7D)" }`
    *   `4xx/5xx`: `{ "error": "Error message description" }` (e.g., invalid KQL, Azure API error)

---

### Sentinel Hunts & Relations

#### 7. List Hunts

*   **Endpoint:** `GET /api/hunts`
*   **Description:** Lists all hunts within the configured Sentinel workspace.
*   **Request Body:** None
*   **Success Response (200 OK):**
    *   Returns an object containing an array of hunt objects.
    ```json
    {
      "value": [
        {
          "id": "/subscriptions/.../hunts/guid",
          "name": "guid", // This is the Hunt ID
          "type": "Microsoft.SecurityInsights/hunts",
          "properties": {
            "displayName": "My Example Hunt",
            "description": "Description of the hunt",
            "status": "New",
            "labels": ["Sentinel TH Integration", /* ... */]
            // ... other properties
          }
        },
        // ... more hunts
      ]
      // "nextLink": "..." // Optional, for pagination
    }
    ```
*   **Error Responses:**
    *   `5xx`: `{ "error": "Error message description" }` (e.g., Azure API error)

#### 8. Create Hunt

*   **Endpoint:** `POST /api/hunts`
*   **Description:** Creates a new hunt in Sentinel.
*   **Request Body (`application/json`):**
    ```json
    {
      "name": "My New Hunt",
      "description": "This hunt focuses on lateral movement."
    }
    ```
    *   `name` (string, required): Display name for the hunt.
    *   `description` (string, optional): Description for the hunt.
*   **Success Response (201 Created):**
    *   Returns the created hunt object (similar structure to GET response).
*   **Error Responses:**
    *   `4xx/5xx`: `{ "error": "Error message description" }` (e.g., invalid input, Azure API error)

#### 9. Link Query to Hunt

*   **Endpoint:** `POST /api/link-query`
*   **Description:** Creates a relation linking an existing saved search (query) to an existing hunt.
*   **Request Body (`application/json`):**
    ```json
    {
      "huntId": "guid-of-the-target-hunt",
      "queryResourceId": "/subscriptions/your-sub-id/resourceGroups/your-rg/providers/Microsoft.OperationalInsights/workspaces/your-ws/savedSearches/guid-of-the-query"
    }
    ```
    *   `huntId` (string, required): The GUID (name property) of the hunt to link to.
    *   `queryResourceId` (string, required): The full Azure Resource ID of the saved search (query) to link.
*   **Success Response (201 Created):**
    *   Returns the created relation object.
    ```json
    {
        "id": "/subscriptions/.../hunts/hunt-guid/relations/relation-guid",
        "name": "relation-guid",
        "type": "Microsoft.SecurityInsights/hunts/relations",
        "properties": {
            "relatedResourceId": "/subscriptions/.../savedSearches/query-guid",
            "relatedResourceType": "Microsoft.OperationalInsights/savedSearches",
            "labels": ["Sentinel TH Integration"]
            // ... other properties
        }
    }
    ```
*   **Error Responses:**
    *   `4xx/5xx`: `{ "error": "Error message description" }` (e.g., invalid IDs, Azure API error)

#### 10. Bulk Create Hunt & Query

*   **Endpoint:** `POST /api/bulk-create-hunt`
*   **Description:** A convenience endpoint that creates a new query, creates a new hunt, and then links the query to the hunt.
*   **Request Body (`application/json`):**
    ```json
    {
      "displayName": "Bulk Query Name",
      "description": "Query created as part of bulk operation",
      "query": "SigninLogs | take 10",
      "huntName": "Bulk Hunt Name",
      "huntDescription": "Hunt created via bulk operation",
      "tactics": ["Discovery"],
      "techniques": ["T1087"]
    }
    ```
    *   All fields corresponding to creating a query (`displayName`, `description`, `query`, `tactics`, `techniques`) and creating a hunt (`huntName`, `huntDescription`) are expected. `displayName`, `query`, and `huntName` are required.
*   **Success Response (201 Created):**
    *   Returns the result of the final **link** operation (the relation object, see endpoint #9).
*   **Error Responses:**
    *   `400 Bad Request`: `{ "error": "Missing required fields..." }`
    *   `5xx`: `{ "error": "Bulk create failed: <underlying error message>" }` (If any step - query creation, hunt creation, or linking - fails)

---

### Cleanup

#### 11. Purge Resources

*   **Endpoint:** `DELETE /api/purge`
*   **Description:** Attempts to delete all hunts, relations, and saved searches created by this integration. Resources are identified by the label/tag `Sentinel TH Integration`. **Use with extreme caution!**
*   **Request Body:** None
*   **Success Response (200 OK):**
    *   Indicates all identified resources were successfully deleted.
    ```json
    {
      "queryCleanup": { "message": "Deleted X/Y queries." },
      "huntCleanup": { "message": "Deleted A/B hunts and C relations." }
    }
    ```
*   **Partial Success/Error Response (207 Multi-Status):**
    *   Indicates one or more cleanup steps encountered errors. Check the response body for details.
    ```json
    {
      "queryCleanup": { "message": "Deleted X/Y queries." }, // Or { "error": "..." } if query cleanup failed
      "huntCleanup": { "error": "Error during hunt cleanup: ..." } // Or { "message": "..." } if hunt cleanup succeeded
    }
    ```
*   **Error Responses:**
    *   `5xx`: `{ "error": "Error message description" }` (If the purge endpoint itself fails catastrophically, though internal errors are usually reported via 207)
