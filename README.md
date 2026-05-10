# HashPulse Python ML Project

This version uses a Python backend for sentiment classification.

## Files

- `app.py` - Flask server and `/api/analyze` endpoint.
- `model/sentiment_model.py` - Python ML model using Logistic Regression + Linear SVM style training.
- `templates/index.html` - Main HashPulse page.
- `assets/style.css` - UI styling.
- `js/comments-data.js` - Reddit/X-style fan comment generator.
- `js/charts.js` - Chart.js visualizations.
- `js/app.js` - Frontend app flow that sends comments to the Python model.
- `requirements.txt` - Python dependency list.

## Run

```bash
pip install -r requirements.txt
python app.py
```

Then open:

```text
http://127.0.0.1:5000
```

The app collects/generates comments in the browser, sends them to Python, and Python returns the classified sentiment results.
