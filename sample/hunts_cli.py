import argparse
from dbclient import Database
from apiclient import HuntsAPIClient
import uuid

def main():
    parser = argparse.ArgumentParser(description="Sentinel Hunts CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # list-queries
    subparsers.add_parser("list-queries", help="List all queries from SigmaCommunity")

    # list-hunts
    subparsers.add_parser("list-hunts", help="List all hunts")

    # add-hunt
    parser_add_hunt = subparsers.add_parser("add-hunt", help="Add a new hunt")
    parser_add_hunt.add_argument("--name", required=True, help="Hunt name")
    parser_add_hunt.add_argument("--description", required=True, help="Hunt description")

    # remove-hunt
    parser_remove_hunt = subparsers.add_parser("remove-hunt", help="Remove a hunt")
    parser_remove_hunt.add_argument("--hunt-id", type=int, help="Local hunt ID")
    parser_remove_hunt.add_argument("--hunt-guid", help="Sentinel hunt GUID")

    # add-query-to-hunt
    parser_add_query = subparsers.add_parser("add-query-to-hunt", help="Add a query to a hunt")
    parser_add_query.add_argument("--hunt-id", type=int, help="Local hunt ID")
    parser_add_query.add_argument("--hunt-guid", help="Sentinel hunt GUID")
    parser_add_query.add_argument("--query-id", type=int, required=True, help="Query ID from SigmaCommunity")

    # remove-query-from-hunt
    parser_remove_query = subparsers.add_parser("remove-query-from-hunt", help="Remove a query from a hunt")
    parser_remove_query.add_argument("--hunt-id", type=int, help="Local hunt ID")
    parser_remove_query.add_argument("--hunt-guid", help="Sentinel hunt GUID")
    parser_remove_query.add_argument("--query-id", type=int, required=True, help="Query ID from SigmaCommunity")

    # get-query
    parser_get_query = subparsers.add_parser("get-query", help="Get a query by ID")
    parser_get_query.add_argument("--query-id", type=int, required=True, help="Query ID from SigmaCommunity")

    # get-hunt
    parser_get_hunt = subparsers.add_parser("get-hunt", help="Get a hunt by ID or GUID")
    parser_get_hunt.add_argument("--hunt-id", type=int, help="Local hunt ID")
    parser_get_hunt.add_argument("--hunt-guid", help="Sentinel hunt GUID")

    args = parser.parse_args()

    db = Database()
    api = HuntsAPIClient()

    if args.command == "list-queries":
        list_queries(db)
    elif args.command == "list-hunts":
        list_hunts(db)
    elif args.command == "add-hunt":
        add_hunt(db, api, args.name, args.description)
    elif args.command == "remove-hunt":
        remove_hunt(db, args.hunt_id, args.hunt_guid)
    elif args.command == "add-query-to-hunt":
        add_query_to_hunt(db, api, args)
    elif args.command == "remove-query-from-hunt":
        remove_query_from_hunt(db, args)
    elif args.command == "get-query":
        get_query(db, args.query_id)
    elif args.command == "get-hunt":
        get_hunt(db, args)
    else:
        parser.print_help()

def list_queries(db):
    queries = db.list_sigma_queries()
    for q in queries:
        print(f"Query ID: {q['id']}")
        print(f"Name: {q['name']}")
        print(f"Description: {q['description']}")
        print(f"Tactics: {q['tactics']}")
        print(f"Techniques: {q['techniques']}")
        print("-" * 40)

def list_hunts(db):
    hunts = db.get_hunts()
    for hunt in hunts:
        print(f"ID: {hunt['id']} | Name: {hunt['name']} | Description: {hunt['description']} | GUID: {hunt['ms_guid']}")

def add_hunt(db, api, name, description):
    guid = str(uuid.uuid4())
    resp = api.create_hunt(name, description, guid)
    # Optionally, check API response success
    hunt_id = db.add_hunt(name, description, guid)
    print(f"Hunt '{name}' added with GUID {guid} and local ID {hunt_id}")

def remove_hunt(db, hunt_id, hunt_guid):
    if hunt_id:
        db.remove_hunt_by_id(hunt_id)
        print(f"Removed hunt with ID {hunt_id}")
    elif hunt_guid:
        db.remove_hunt_by_guid(hunt_guid)
        print(f"Removed hunt with GUID {hunt_guid}")
    else:
        print("Please provide --hunt-id or --hunt-guid")

def add_query_to_hunt(db, api, args):
    hunt_id = args.hunt_id
    hunt_guid = args.hunt_guid
    query_id = args.query_id

    # Resolve hunt_id if only GUID provided
    if not hunt_id and hunt_guid:
        hunt_id = db.get_hunt_id(hunt_guid)
        if not hunt_id:
            print("Hunt GUID not found in DB")
            return

    # Check query exists
    if not db.query_exists(query_id):
        print("Query ID not found in SigmaCommunity")
        return

    db.add_query_to_hunt(hunt_id, query_id)
    print(f"Linked query {query_id} to hunt {hunt_id} in local database")

def remove_query_from_hunt(db, args):
    hunt_id = args.hunt_id
    hunt_guid = args.hunt_guid
    query_id = args.query_id

    # Resolve hunt_id if only GUID provided
    if not hunt_id and hunt_guid:
        hunt_id = db.get_hunt_id(hunt_guid)
        if not hunt_id:
            print("Hunt GUID not found in DB")
            return

    db.remove_query_from_hunt(hunt_id, query_id)
    print(f"Removed query {query_id} from hunt {hunt_id}")

def get_query(db, query_id):
    query = db.get_sigma_query_by_id(query_id)
    if not query:
        print(f"Query ID {query_id} not found.")
        return
    for key, value in query.items():
        print(f"{key}: {value}")
    print("-" * 40)

def get_hunt(db, args):
    hunt_id = args.hunt_id
    hunt_guid = args.hunt_guid

    # Resolve hunt_id if only GUID provided
    if not hunt_id and hunt_guid:
        hunt_id = db.get_hunt_id(hunt_guid)
        if not hunt_id:
            print("Hunt GUID not found in DB")
            return

    if not hunt_id:
        print("Please provide --hunt-id or --hunt-guid")
        return

    # Fetch hunt details
    hunts = db.get_hunts()
    hunt = next((h for h in hunts if h["id"] == hunt_id), None)
    if not hunt:
        print(f"Hunt ID {hunt_id} not found.")
        return

    print(f"Hunt ID: {hunt['id']}")
    print(f"Name: {hunt['name']}")
    print(f"Description: {hunt['description']}")
    print(f"GUID: {hunt['ms_guid']}")

    # Fetch linked queries
    queries = db.get_queries_by_hunt(hunt_id)
    print("Linked Query IDs:")
    for q in queries:
        print(f"- {q['id']}")
    print("-" * 40)

if __name__ == "__main__":
    main()
