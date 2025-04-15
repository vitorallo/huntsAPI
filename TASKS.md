# TASKS.md

## 1. Introduction

This project is a Node.js application that provides an API to interact with Microsoft Sentinel and Azure Active Directory. It enables streamlined management of Sentinel hunting queries and hunts, offering an abstraction layer over the MicrosoftSecurityInsights and Sentinel APIs.

---

## 2. Accomplished Tasks

### Application Registration & Configuration

- Implemented Azure AD application registration (manual or via API).
- Environment configuration for Azure and Sentinel integration using `.env` variables.

### Core Features

- Manage Microsoft Sentinel hunting queries:
  - List all queries.
  - Create queries from JSON or KQL file.
  - Run KQL queries against Log Analytics.
- Manage Microsoft Sentinel hunts:
  - List all hunts.
  - Create new hunts.
- Link Sentinel queries to hunts.
- Perform bulk operations (create query, create hunt, link them).
- Purge all resources created by this integration (queries, hunts, relations).

### Implemented API Endpoints

#### Application Management

- `POST /api/register-app`: Register a new Azure AD application and assign Sentinel API permissions.
- `GET /api/app-info`: Retrieve details about the registered Azure AD application.

#### Sentinel Hunting Queries

- `GET /api/hunting-queries`: List all saved searches (hunting queries) in the Sentinel workspace.
- `POST /api/hunting-queries`: Create a new hunting query from JSON input.
- `POST /api/hunting-queries/upload`: Create a new hunting query from an uploaded KQL file.
- `POST /api/hunting-queries/run`: Run a KQL query against the Log Analytics workspace.

#### Sentinel Hunts & Relations

- `GET /api/hunts`: List all hunts in the Sentinel workspace.
- `POST /api/hunts`: Create a new hunt.
- `POST /api/link-query`: Link an existing query to a hunt.
- `POST /api/bulk-create-hunt`: Create a query, create a hunt, and link them in one operation.

#### Cleanup

- `DELETE /api/purge`: Delete all queries, hunts, and relations created by this integration.

### Permissions & Security

- Azure AD application registration with required permissions.
- Microsoft Graph API permissions (Application.ReadWrite.All, User.Read).
- Azure Management API permissions (user_impersonation).
- RBAC roles for Sentinel workspace (Sentinel Reader/Contributor).

### Tooling & Documentation

- Postman collection and OpenAPI (Swagger) documentation for API exploration and testing.

---

## 3. API Structure and Relationships

```mermaid
graph TD
    A[Azure AD App Registration] -->|Manual/API| B[API Server]
    B --> C[Sentinel Hunting Queries]
    B --> D[Sentinel Hunts]
    C --> E[List/Create/Run Queries]
    D --> F[List/Create Hunts]
    C --> G[Link Queries to Hunts]
    B --> H[Bulk Operations]
    B --> I[Purge Resources]
    B --> J[API Endpoints]
    J --> E
    J --> F
    J --> G
    J --> H
    J --> I
    B --> L[Postman & Swagger Docs]