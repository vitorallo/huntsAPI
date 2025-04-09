# Sentinel Hunts Sample CLI

This directory contains a **sample Python CLI application** to manage hunting queries and hunts for Microsoft Sentinel, using a local SQLite database and a REST API client.

The DB in this folder has been created by converting SIGMA rules from the [SIGMA Community](https://github.com/SigmaHQ/sigma) repository into a format that can be used by the Sentinel (KQL) using the tool at this address: https://github.com/Crimson7research

---

## Features

- List all Sigma queries from the local database
- List all hunts
- Add new hunts (with UUIDs)
- Remove hunts
- Add queries to hunts (local DB only)
- Remove queries from hunts
- View details of a query
- View details of a hunt and its linked queries

---

## Architecture

- **`dbclient.py`**: Handles all SQLite database operations.
- **`apiclient.py`**: Communicates with the Sentinel REST API.
- **`hunts_cli.py`**: Command-line interface to manage hunts and queries.
- **`rules.db`**: SQLite database file containing tables:
  - `hunts`
  - `SigmaCommunity` (queries)
  - `hunting_queries` (relations)

---

## Setup

1. **Install dependencies**

This project uses only the Python standard library and `requests`:

```bash
pip install requests
```

2. **Ensure the database exists**

The first run will look for `rules.db` with the required tables if missing. Ensure it exists before running the CLI tool.

3. **Configure API endpoint**

By default, the API client points to `http://localhost:3001`. Modify `apiclient.py` if needed.
The API server with the Sentinel Integration App must be running.
Open a shell, go to the root folder and run:

```bash
npm start 
```

---

## Usage

Run the CLI tool:

```bash
python hunts_cli.py <command> [options]
```

### List all queries
Start with this commend to dump all the queries from the local database, grab a few IDs you want to use.

```bash
python hunts_cli.py list-queries
```

### Add a new hunt
As a second step, add a new hunt to the local database.

```bash
python hunts_cli.py add-hunt --name "My Hunt" --description "Detect suspicious activity"
```

### List all hunts

```bash
python hunts_cli.py list-hunts
```

### Remove a hunt

```bash
python hunts_cli.py remove-hunt --hunt-id 1
# or
python hunts_cli.py remove-hunt --hunt-guid <GUID>
```

### Add a query to a hunt (local DB only)
As a third step, associate all the queries you want, one by one, referencing the query ID (you got from step 1) and the hunt ID (you got from step 2).

```bash
python hunts_cli.py add-query-to-hunt --hunt-id 1 --query-id 42
# or
python hunts_cli.py add-query-to-hunt --hunt-guid <GUID> --query-id 42
```

### Remove a query from a hunt

```bash
python hunts_cli.py remove-query-from-hunt --hunt-id 1 --query-id 42
```

### Get details of a query

```bash
python hunts_cli.py get-query --query-id 42
```

### Get details of a hunt and its linked queries
This is to verify all the queries assicited with a specific hunt, to confirm they are all linked.

```bash
python hunts_cli.py get-hunt --hunt-id 1
# or
python hunts_cli.py get-hunt --hunt-guid <GUID>
```

---

## Notes

- Adding a hunt generates a random UUID used as its GUID.
- Adding a query to a hunt **only** updates the local database.
- The API client is used for creating hunts and queries in Sentinel, but linking queries to hunts in Sentinel is **not** automated here.
- The database can be browsed with any SQLite tool.

---

## Loading the queries to Sentinel

The python script `loadsentinel.py` can be used to load the queries to Sentinel. It's pretty straightforward, nothing to do except to run it.
If the scripts executed correctly you should see a new "hunt" in Sentinel that contains all the queries you assiciated with it.

```bash
python loadsentinel.py
```

This script will only work if the API server is running on `http://localhost:3001`.

---

## Disclaimer

Crimson7 and the authors of this script are not responsible for any misuse of this script that may involves the use of the Sentinel API, or pollute the Sentinel workspace with queries. Use your judgement.

---

## Related Documentation

- [Main Project README](../README.md)
- [API Documentation](../API_DOCUMENTATION.md)
