import requests

class HuntsAPIClient:
    def __init__(self, base_url="http://localhost:3001"):
        self.base_url = base_url

    def create_hunt(self, name, description, extid):
        """POST /api/hunts: Create a new hunt."""
        url = f"{self.base_url}/api/hunts"
        payload = {"name": name, "description": description, "extid": extid}
        response = requests.post(url, json=payload)
        response.raise_for_status()
        return response.json()  # Assumes response includes "ms_guid"

    def add_hunting_query(self, name, description, query, tactics, techniques, extid):
        """POST /api/hunting-queries: Add a new query with MITRE data."""
        url = f"{self.base_url}/api/hunting-queries"
        payload = {
            "name": name,
            "description": description,
            "query": query,
            "tactics": tactics,
            "techniques": techniques,
            "extid": extid
        }
        #print(payload)
        response = requests.post(url, json=payload)
        response.raise_for_status()
        return response.json()  # Assumes response includes "guid", "ms_guid", "ms_armid"

    def link_query(self, hunt_guid, query_resource_id, extid):
        """POST /api/link-query: Link a query to a hunt."""
        url = f"{self.base_url}/api/link-query"
        payload = {
            "huntId": hunt_guid,
            "queryResourceId": query_resource_id,
            "extid": extid
        }
        response = requests.post(url, json=payload)
        response.raise_for_status()
        return response.json()