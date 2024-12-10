from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import sqlite3
import generator
import converters
from wrapper import get_constraints

app = Flask(__name__)
CORS(app)

conn = sqlite3.connect('database.db', check_same_thread=False)
db = conn.cursor()

@app.route('/')
def popup():
    return render_template("popup.html")

@app.route('/api/data')
def get_data():
    question = "53rr5er344"
    text = "placeholder"
    
    db.execute("SELECT code FROM generated_code WHERE question = ?", (question,))
    result = db.fetchone()

    if result:
        code = result[0]
    else:
        code = "text = converters.convert_to_string(generator.IntGenerator(2, 10).generate())"
        db.execute('INSERT INTO generated_code (question, code) VALUES (?, ?)', (question, code))
        conn.commit()
    print(code)
    local_scope = {'text': text}
    exec(code, globals(), local_scope)
    text = local_scope['text']
    
    return text


def wipe_database():
    db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_sequence';")
    tables = db.fetchall()

    for table_name in tables:
        db.execute(f"DROP TABLE IF EXISTS {table_name[0]};")

    db.execute("""
    CREATE TABLE IF NOT EXISTS generated_code (
        question TEXT PRIMARY KEY,
        code TEXT NOT NULL
    )
    """)

    conn.commit()

if __name__ == "__main__":
    # wipe_database()
    app.run(debug=True)

    # int_gen = generator.IntGenerator(2, 10)
    # str_gen = generator.StringGenerator(int_gen, "abcdefg", False, False)
    # array_gen = generator.ArrayGenerator(int_gen, str_gen, False, False)
    # array2_gen = generator.ArrayGenerator(int_gen, array_gen, False, False)

    # it = array2_gen.generate()
    # return converters.convert_to_string(it)