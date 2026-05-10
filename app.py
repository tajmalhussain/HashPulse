from flask import Flask, jsonify, render_template, request

from model.sentiment_model import analyze_comments


app = Flask(__name__, static_folder=".", static_url_path="", template_folder="templates")


@app.get("/")
def index():
    return render_template("index.html")


@app.post("/api/analyze")
def analyze():
    payload = request.get_json(silent=True) or {}
    items = payload.get("items", [])

    if not isinstance(items, list):
        return jsonify({"error": "items must be a list"}), 400

    texts = [str(item.get("text", "")) if isinstance(item, dict) else str(item) for item in items]
    predictions = analyze_comments(texts)

    return jsonify(
        {
            "model": "Python Logistic Regression + Linear SVM",
            "predictions": predictions,
        }
    )


if __name__ == "__main__":
    app.run(debug=True)
