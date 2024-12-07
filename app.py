from flask import Flask, request, jsonify, render_template
import sqlite3
import generator
import converters

app = Flask(__name__)
conn = sqlite3.connect('database.db', check_same_thread=False)
db = conn.cursor()

@app.route('/')
def popup():
    return render_template("popup.html")

@app.route('/api/data')
def get_data():

    int_gen = generator.IntGenerator(2, 10)
    str_gen = generator.StringGenerator(int_gen, "abcdefg", False, False)
    array_gen = generator.ArrayGenerator(int_gen, str_gen, False, False)
    array2_gen = generator.ArrayGenerator(int_gen, array_gen, False, False)

    it = array2_gen.generate()
    return converters.convert_to_string(it)

# all random test stuff for db under here
db.execute("""
    CREATE TABLE IF NOT EXISTS test_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        value TEXT NOT NULL
    )
""")    

db.execute("INSERT INTO test_table (name, value) VALUES (?, ?)", ("Sample Name", "Sample Value"))
db.execute("DELETE FROM test_table")

conn.commit()

rows = db.execute("SELECT * FROM test_table").fetchall()
print("Table Data:")
for row in rows:
    print(row)


if __name__ == "__main__":
    app.run(debug=True)