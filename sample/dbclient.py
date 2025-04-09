import sqlite3

class Database:
    def __init__(self, db_path="rules.db"):
        self.conn = sqlite3.connect("rules.db")
        self.conn.row_factory = sqlite3.Row
        cursor = self.conn.cursor()
        #initialise the hunts table
        cursor.execute("""CREATE TABLE IF NOT EXISTS hunts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            description TEXT, 
			ms_guid TEXT NULL)""")
        #initialize the link hunts to queries
        cursor.execute("""CREATE TABLE IF NOT EXISTS hunting_queries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            huntid INTEGER,
            queryid INTEGER,
            FOREIGN KEY("huntid") REFERENCES "hunts"("id"),
	        FOREIGN KEY("queryid") REFERENCES "SigmaCommunity"("id"))""")
        

    # --- Lookup Methods ---
    def get_hunt_id_by_guid(self, ms_guid):
        cursor = self.conn.cursor()
        cursor.execute("SELECT id FROM hunts WHERE ms_guid = ?", (ms_guid,))
        result = cursor.fetchone()
        return result[0] if result else None
    
    def get_query_id_by_guid(self, ms_guid):
        cursor = self.conn.cursor()
        cursor.execute("SELECT id FROM queries WHERE ms_guid = ?", (ms_guid,))
        result = cursor.fetchone()
        return result[0] if result else None
    
    def get_hunts(self):
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM hunts")
        #results = cursor.fetchall()
        results = [dict(row) for row in cursor.fetchall()]
        return results

    def list_sigma_queries(self):
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM SigmaCommunity")
        return [dict(row) for row in cursor.fetchall()]

    def add_hunt(self, name, description, ms_guid):
        cursor = self.conn.cursor()
        cursor.execute(
            "INSERT INTO hunts (name, description, ms_guid) VALUES (?, ?, ?)",
            (name, description, ms_guid),
        )
        self.conn.commit()
        return cursor.lastrowid

    def remove_hunt_by_id(self, hunt_id):
        cursor = self.conn.cursor()
        cursor.execute("DELETE FROM hunts WHERE id = ?", (hunt_id,))
        cursor.execute("DELETE FROM hunting_queries WHERE huntid = ?", (hunt_id,))
        self.conn.commit()

    def remove_hunt_by_guid(self, hunt_guid):
        cursor = self.conn.cursor()
        cursor.execute("SELECT id FROM hunts WHERE ms_guid = ?", (hunt_guid,))
        row = cursor.fetchone()
        if row:
            hid = row["id"]
            self.remove_hunt_by_id(hid)

    def add_query_to_hunt(self, hunt_id, query_id):
        cursor = self.conn.cursor()
        cursor.execute(
            "INSERT INTO hunting_queries (huntid, queryid) VALUES (?, ?)",
            (hunt_id, query_id),
        )
        self.conn.commit()

    def remove_query_from_hunt(self, hunt_id, query_id):
        cursor = self.conn.cursor()
        cursor.execute(
            "DELETE FROM hunting_queries WHERE huntid = ? AND queryid = ?",
            (hunt_id, query_id),
        )
        self.conn.commit()

    def get_hunt_guid(self, hunt_id):
        cursor = self.conn.cursor()
        cursor.execute("SELECT ms_guid FROM hunts WHERE id = ?", (hunt_id,))
        row = cursor.fetchone()
        return row["ms_guid"] if row else None

    def get_hunt_id(self, hunt_guid):
        cursor = self.conn.cursor()
        cursor.execute("SELECT id FROM hunts WHERE ms_guid = ?", (hunt_guid,))
        row = cursor.fetchone()
        return row["id"] if row else None

    def query_exists(self, query_id):
        cursor = self.conn.cursor()
        cursor.execute("SELECT 1 FROM SigmaCommunity WHERE id = ?", (query_id,))
        return cursor.fetchone() is not None
    
    def get_queries_by_hunt(self, hunt_id):
        cursor = self.conn.cursor()
        print(f"hunt_id: {hunt_id}")
        cursor.execute("SELECT * FROM SigmaCommunity as s, hunts as h JOIN hunting_queries as hq ON hq.huntid = h.id AND hq.queryid = s.id WHERE h.id = ?", (hunt_id,))
        #results = cursor.fetchall()
        results = [dict(row) for row in cursor.fetchall()]
        return results

    def get_sigma_query_by_id(self, query_id):
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM SigmaCommunity WHERE id = ?", (query_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
