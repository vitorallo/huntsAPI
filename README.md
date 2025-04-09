# Microsoft Sentinel Integration API

This Node.js application provides an API to interact with Microsoft Sentinel and Azure Active Directory. It allows you to:

---

## Sample Python CLI Application

A sample Python CLI tool for managing hunts and queries locally is included in the [`sample/`](sample/) directory.

See the detailed [Sample CLI README](sample/README.md) for setup instructions and usage examples.

---

*   Register the application itself within Azure AD.
*   Retrieve information about the registered application.
*   Manage Microsoft Sentinel hunting queries (list, create from JSON/KQL file, run).
*   Manage Microsoft Sentinel hunts (list, create).
*   Link Sentinel queries to hunts.
*   Perform bulk operations (create hunt + query + link).
*   Purge resources created by this integration.

## Prerequisites

*   Node.js (Version specified in `package.json` or higher recommended)
*   An Azure subscription with Microsoft Sentinel enabled
*   An Azure AD application registration (can be created using the `/api/register-app` endpoint or manually) with appropriate permissions granted.

## Setup

1.  Clone this repository.
2.  Install dependencies: `npm install`
3.  Create a `.env` file in the root directory with the following variables:

    ```dotenv
    # Azure AD App Registration details (used for authentication)
    AZURE_TENANT_ID=your_tenant_id
    AZURE_CLIENT_ID=your_client_id
    AZURE_CLIENT_SECRET=your_client_secret

    # Microsoft Sentinel Workspace details
    WORKSPACE_NAME=your_workspace_name
    WORKSPACE_ID=your_workspace_id # Optional, currently unused in code
    WORKSPACE_RESOURCE_GROUP=your_resource_group
    SUBSCRIPTION_ID=your_subscription_id
    # API_VERSION=2022-11-01 # Optional: Default Azure Management API version (defaults to 2022-11-01 in config.js if not set)
    ```

## Permissions

The application requires specific permissions to function correctly:

**1. Azure AD Application Registration (Self-Management):**

*   If using the `/api/register-app` endpoint, the service principal running *this* application needs permissions to create *other* applications in Azure AD. This typically requires a high-privilege role like **Application Administrator** or **Cloud Application Administrator** assigned in Azure AD.

Little tip: do not use it :) do your own work and setup permissions manually.

**2. Microsoft Graph API (for `/api/app-info` and `/api/register-app`):**

*   The registered application (identified by `AZURE_CLIENT_ID` in `.env`) needs **Application.ReadWrite.All** (delegated or application permission, depending on your scenario, though the code uses client credentials flow suggesting Application permission is intended). Admin consent is required for this permission. Little tip: do not use it :) do your own work and setup permissions manually.

*   This is ABSOLUTELY NEEDED!!! The `app-registration.js` code also requests **User.Read** (delegated scope) by default..

**3. Azure Management API (for Sentinel Operations):**
The permissions below are absolutely needed to run the application and allow the Enteprise App to access the Sentinel API.

*   The registered application needs the **user_impersonation** scope for the **Azure Service Management** API (`797f4846-ba00-4fd7-ba43-dac1f8f63013`). This is added by the `/api/register-app` endpoint or needs to be added manually if you skilled step 1.
*   The service principal of the registered application must have appropriate RBAC role assignments on the **Microsoft Sentinel workspace**:
    *   Read operations (GET endpoints): **Microsoft Sentinel Reader** role (or higher).
    *   Write/Delete operations (POST, PUT, DELETE endpoints): **Microsoft Sentinel Contributor** role (or higher).
You can assign those at the workspace level or at the resource level.

**Granting Permissions:**

*   **API Permissions:** Navigate to your application registration in Azure AD -> API permissions. Add the required permissions (Graph, Azure Service Management) and grant admin consent if necessary.
*   **RBAC Roles:** Navigate to your Microsoft Sentinel workspace in the Azure Portal -> Access control (IAM). Add role assignments (Sentinel Reader/Contributor) for your application's service principal.

## Usage

Start the server:

```bash
npm start
```

The API will be available at `http://localhost:3001` (or the port specified by the `PORT` environment variable).

## API Endpoints

**Application Management**

*   `POST /api/register-app`
    *   Registers a new application in Azure AD (using details from request body or defaults) and assigns necessary Sentinel API permissions.
    *   Requires the service principal running this API to have app creation privileges in Azure AD.
    *   Body (Optional): `{ "appName": "Your App Name", "redirectUris": ["http://localhost/callback"] }`
*   `GET /api/app-info`
    *   Gets information about the application specified by `AZURE_CLIENT_ID` in the `.env` file.

**Sentinel Hunting Queries**

*   `GET /api/hunting-queries`
    *   Lists all saved searches (including hunting queries) in the Sentinel workspace.
*   `POST /api/hunting-queries`
    *   Creates a new hunting query from JSON input.
    *   Body: `{ "name": "Query Display Name", "description": "...", "query": "KQL Query Text", "tactics": ["InitialAccess"], "techniques": ["T1078"] }` (Tactics/Techniques are optional)
*   `POST /api/hunting-queries/upload`
    *   Creates a new hunting query from an uploaded KQL file (multipart/form-data). Expects a file field named `file`.
    *   See "KQL File Format" below.
*   `POST /api/hunting-queries/run`
    *   Runs a given KQL query against the Log Analytics workspace.
    *   Body: `{ "query": "KQL Query Text", "timespan": "P1D" }` (Timespan defaults to P1D - 1 day)

**Sentinel Hunts & Relations**

*   `GET /api/hunts`
    *   Lists all hunts in the Sentinel workspace.
*   `POST /api/hunts`
    *   Creates a new hunt.
    *   Body: `{ "name": "Hunt Display Name", "description": "..." }`
*   `POST /api/link-query`
    *   Links an existing saved search (query) to an existing hunt.
    *   Body: `{ "huntId": "GUID-of-the-hunt", "queryResourceId": "/subscriptions/.../savedSearches/GUID-of-the-query" }`
*   `POST /api/bulk-create-hunt`
    *   Creates a query, creates a hunt, and links them together in one operation.
    *   Body: `{ "displayName": "Query Name", "description": "Query Desc", "query": "KQL Query", "huntName": "Hunt Name", "huntDescription": "Hunt Desc", "tactics": [], "techniques": [] }` (Tactics/Techniques optional)

**Cleanup**

*   `DELETE /api/purge`
    *   Deletes hunts, relations, and queries created by this integration (identified by the label/tag "Sentinel TH Integration"). Use with caution!

## KQL File Format (`/api/hunting-queries/upload`)

KQL files should contain metadata in comments at the top, followed by the query:

```kql
// Metadata:
// Name: My Hunting Query Name
// Description: This query detects suspicious activity.
// Tactics: InitialAccess, Execution
// Techniques: T1190, T1204.1

// Query:
SecurityEvent
| where EventID == 4624
| where AccountType == "User"
| project TimeGenerated, Account, Computer
```

*   `Name` is mandatory in the metadata.
*   `Description`, `Tactics`, `Techniques` are optional.
