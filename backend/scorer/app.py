import os
import re
import pickle
import traceback
import numpy as np
from flask import Flask, jsonify, request
from joblib import load

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "model.joblib")
VECTORIZER_PATH = os.path.join(os.path.dirname(__file__), "models", "vectorizer.pickle")

labeldict = {
    0: 'Arts',
    1: 'Automation Testing',
    2: 'Operations Manager',
    3: 'DotNet Developer',
    4: 'Civil Engineer',
    5: 'Data Science',
    6: 'Database',
    7: 'DevOps Engineer',
    8: 'Business Analyst',
    9: 'Health and fitness',
    10: 'HR',
    11: 'Electrical Engineering',
    12: 'Java Developer',
    13: 'Mechanical Engineer',
    14: 'Network Security Engineer',
    15: 'Blockchain',
    16: 'Python Developer',
    17: 'Sales',
    18: 'Testing',
    19: 'Web Designing'
}

vectorizer = None
model = None
model_ready = False
model_load_error = ""

try:
    with open(VECTORIZER_PATH, "rb") as f:
        vectorizer = pickle.load(f)
    model = load(MODEL_PATH)
    _probe = vectorizer.transform(np.array(["sample resume python sql project"]))
    _ = model.predict(_probe)
    model_ready = True
except Exception as exc:
    model_ready = False
    model_load_error = str(exc)

app = Flask(__name__)


def clean_resume(text: str) -> str:
    text = re.sub(r'http\S+\s*', ' ', text)
    text = re.sub(r'RT|cc', ' ', text)
    text = re.sub(r'#\S+', '', text)
    text = re.sub(r'@\S+', ' ', text)
    text = re.sub(r'[!"#$%&\'()*+,\-./:;<=>?@[\\\]^_`{|}~]', ' ', text)
    text = re.sub(r'[^\x00-\x7f]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip().lower()


def derive_quality_score(cleaned_text: str, confidence: float) -> int:
    words = cleaned_text.split()
    length_score = min(len(words) / 500.0, 1.0) * 100
    section_bonus = 0

    section_keywords = ["skills", "project", "experience", "education", "certification"]
    for keyword in section_keywords:
        if keyword in cleaned_text:
            section_bonus += 5

    confidence_score = max(min(confidence * 100, 100), 0)
    raw = confidence_score * 0.75 + length_score * 0.2 + min(section_bonus, 25) * 0.05
    return int(max(min(round(raw), 100), 0))


def fallback_score(cleaned_text: str):
    words = cleaned_text.split()
    length_score = min(len(words) / 450.0, 1.0) * 100
    keyword_hits = 0
    keyword_bank = [
        "python", "java", "javascript", "react", "node", "sql", "mongodb",
        "project", "experience", "education", "internship", "machine", "learning"
    ]
    for keyword in keyword_bank:
        if keyword in cleaned_text:
            keyword_hits += 1

    keyword_score = min((keyword_hits / len(keyword_bank)) * 100, 100)
    score = round(length_score * 0.55 + keyword_score * 0.45)
    return int(max(min(score, 100), 0))


@app.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "sieve-scorer",
        "modelReady": model_ready,
        "modelLoadError": model_load_error if not model_ready else ""
    })


@app.post("/score")
def score_resume():
    payload = request.get_json(silent=True) or {}
    text = payload.get("text", "")

    if not isinstance(text, str) or not text.strip():
        return jsonify({"message": "text is required"}), 400

    cleaned = clean_resume(text)

    if not model_ready:
        return jsonify({
            "resumeScore": fallback_score(cleaned),
            "predictedCategory": "Unknown",
            "confidence": None,
            "scoreSource": "fallback",
            "modelReady": False,
            "warning": "Model artifacts are incompatible with current sklearn runtime; fallback scoring used."
        })

    try:
        vector = vectorizer.transform(np.array([cleaned]))

        prediction = model.predict(vector)
        predicted_idx = int(prediction[0])
        predicted_category = labeldict.get(predicted_idx, "Unknown")

        confidence = None
        if hasattr(model, "predict_proba"):
            probabilities = model.predict_proba(vector)
            confidence = float(np.max(probabilities))

        resume_score = derive_quality_score(cleaned, confidence if confidence is not None else 0.5)

        return jsonify({
            "resumeScore": resume_score,
            "predictedCategory": predicted_category,
            "confidence": confidence,
            "scoreSource": "sieve_model",
            "modelReady": True
        })
    except Exception as exc:
        traceback.print_exc()
        return jsonify({
            "resumeScore": fallback_score(cleaned),
            "predictedCategory": "Unknown",
            "confidence": None,
            "scoreSource": "fallback",
            "modelReady": False,
            "warning": f"Model inference failed: {exc}"
        })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002)