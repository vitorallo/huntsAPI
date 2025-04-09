from dbclient import *
from apiclient import *
from sys import exit

db = Database()
api = HuntsAPIClient()

hunts = db.get_hunts()

for hunt in hunts:
    print(f"Processing hunt {hunt['name']}")
    SentinelHunt = api.create_hunt(hunt['name'], hunt['description'], hunt['id'])
    if SentinelHunt['name'] is not None:
        huntguid = SentinelHunt['name']
        print (f"  Hunt created with guid {huntguid}")
    else:
        exit("Error creating hunt")
    # we can go on and fetch queries    
    queries = db.get_queries_by_hunt(hunt['id'])
    for query in queries:
        print(f"  Processing query {query['name']} with id {query['id']}")
        # call the api to create the query
        print(f"    Creating query for {query['id']}")
        SentinelQuery = api.add_hunting_query(query['name'], query['description'], query['query'], query['tactics'], query['techniques'], query['id'])    
        # link the query to the hunt
        print(f"    Linking query {SentinelQuery['id']} to hunt {huntguid}","")
        api.link_query(huntguid, SentinelQuery['id'], "0") # tagging those relations as "0" for now which is not good

db.conn.close()