from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
import requests
import traceback

# ======================
# 🚀 FLASK SETUP
# ======================
app = Flask(name)
CORS(app)

# ======================
# 🐘 DATABASE CONNECTION
# ======================
conn = psycopg2.connect(
    dbname="stock",
    user="postgres",
    password="aya66",
    host="localhost",
    port="5432"
)
cursor = conn.cursor()

# ======================
# 📦 GET STOCK DATA
# ======================
def get_stock():
    cursor.execute("SELECT nom_produit, quantite, niveau_alerte FROM produits")
    products = cursor.fetchall()

    if not products:
        return "No stock data"

    stock_text = ""
    for p in products:
        stock_text += f"{p[0]} | qty:{p[1]} | alert:{p[2]}\n"

    return stock_text

# ======================
# 🤖 LOCAL AI (LM STUDIO)
# ======================
def ask_ai(user_msg, stock_text):
    prompt = f"""
You are a smart stock assistant.

You only use the data below:

STOCK DATA:
{stock_text}

RULES:
- if quantity <= alert → LOW STOCK → BUY
- if quantity > alert * 2 → SURPLUS
- else → OK

TASK:
Answer user question based ONLY on stock data.

User question:
{user_msg}

Give clear and simple answer in Arabic only .
"""

    try:
        response = requests.post(
            "http://localhost:1234/v1/chat/completions",
            json={
                "model": "local-model",
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.2
            }
        )

        return response.json()["choices"][0]["message"]["content"]

    except Exception as e:
        print("AI ERROR:", e)
        return "❌ AI service not available (check LM Studio server)"

# ======================
# 💬 CHAT ENDPOINT
# ======================
@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        user_msg = data.get("message", "")

        print("USER:", user_msg)

        # get stock
        stock_text = get_stock()
        print("STOCK:\n", stock_text)

        # ask AI
        reply = ask_ai(user_msg, stock_text)

        return jsonify({
            "reply": reply
        })

    except Exception as e:
        print("SERVER ERROR:", traceback.format_exc())
        return jsonify({
            "reply": "❌ Server error"
        }), 500

# ======================
# 🧪 TEST ROUTE
# ======================
@app.route("/")
def home():
    return jsonify({"status": "stock chatbot running 🚀"})

# ======================
# 🚀 RUN SERVER
# ======================
if name == "main":
    app.run(debug=True, port=5000)
