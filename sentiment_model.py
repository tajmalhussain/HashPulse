import math
import re
from dataclasses import asdict, dataclass


LABELS = ["positive", "negative", "neutral"]

TRAINING_DATA = [
    ("brilliant performance from the team and a deserved win", "positive"),
    ("fans are buzzing after that amazing comeback", "positive"),
    ("elite finish great passing and strong confidence", "positive"),
    ("superb defending and excellent attitude from everyone", "positive"),
    ("love the energy this squad showed today", "positive"),
    ("class goal absolute masterclass from the captain", "positive"),
    ("dominant display the team looked unstoppable", "positive"),
    ("happy with the result and proud of the effort", "positive"),
    ("sharp movement good tempo and clinical finishing", "positive"),
    ("the player changed the game with a magical assist", "positive"),
    ("that recovery tackle was worth a goal", "positive"),
    ("subs came on with a job and changed the match", "positive"),
    ("proper fight from the team under pressure", "positive"),
    ("the press finally had angles and structure", "positive"),
    ("terrible defending and a painful miss again", "negative"),
    ("awful call from the referee ruined the match", "negative"),
    ("the tactics made no sense and fans are angry", "negative"),
    ("disappointing result after a poor second half", "negative"),
    ("worst performance of the season and no ideas", "negative"),
    ("sloppy passing weak pressing and flat energy", "negative"),
    ("that collapse was embarrassing for the club", "negative"),
    ("furious with the coach after that disaster", "negative"),
    ("injury news is worrying and the mistakes were unacceptable", "negative"),
    ("another frustrating night with no creativity", "negative"),
    ("same defensive mistake different week", "negative"),
    ("awful game management invited pressure again", "negative"),
    ("the back line spacing was embarrassing", "negative"),
    ("the match ended in a draw", "neutral"),
    ("both teams had chances but neither controlled the game", "neutral"),
    ("lineup announced before kickoff", "neutral"),
    ("fans are discussing the transfer news", "neutral"),
    ("the player returned to training today", "neutral"),
    ("match thread is open for comments", "neutral"),
    ("the score remained level at half time", "neutral"),
    ("club statement will arrive tomorrow", "neutral"),
    ("possession was evenly split across both sides", "neutral"),
    ("the fixture has been rescheduled", "neutral"),
]

STOP_WORDS = {
    "the", "a", "an", "and", "or", "but", "to", "of", "for", "from", "in",
    "on", "at", "with", "this", "that", "was", "were", "is", "are", "be",
    "been", "it", "as", "by", "after", "before", "again", "today", "tonight",
}

EMOTION_TERMS = [
    ({"amazing", "incredible", "unreal", "sensational", "electric", "comeback", "buzzing"}, "excited"),
    ({"proud", "captain", "leadership", "masterclass", "dominant", "unstoppable"}, "proud"),
    ({"love", "brilliant", "superb", "excellent", "happy", "class", "magical"}, "happy"),
    ({"frustrating", "frustrated", "sloppy", "weak", "flat", "poor"}, "frustrated"),
    ({"furious", "angry", "awful", "terrible", "disaster", "unacceptable"}, "angry"),
    ({"disappointing", "painful", "missed", "collapse", "worrying", "worst"}, "disappointed"),
]


@dataclass
class Prediction:
    text: str
    sentiment: str
    compound: float
    pos: int
    neg: int
    neu: int
    confidence: int
    emotion: str
    intensity: str
    sarcasm: bool
    key_words: list[str]

    def to_dict(self):
        return asdict(self)


def tokenize(text: str) -> list[str]:
    words = re.sub(r"#[\w-]+", " ", text.lower())
    words = re.sub(r"[^a-z0-9\s]", " ", words).split()
    base = [word for word in words if len(word) > 1 and word not in STOP_WORDS]
    bigrams = [f"{base[i]}_{base[i + 1]}" for i in range(len(base) - 1)]
    return base + bigrams


def softmax(scores: list[float]) -> list[float]:
    high = max(scores)
    exps = [math.exp(score - high) for score in scores]
    total = sum(exps) or 1.0
    return [value / total for value in exps]


def dot(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


class HashPulseMLModel:
    def __init__(self):
        self.vocab = sorted({token for text, _label in TRAINING_DATA for token in tokenize(text)})
        self.label_index = {label: index for index, label in enumerate(LABELS)}
        self.logistic_w = [[0.0 for _ in self.vocab] for _ in LABELS]
        self.logistic_b = [0.0 for _ in LABELS]
        self.svm_w = [[0.0 for _ in self.vocab] for _ in LABELS]
        self.svm_b = [0.0 for _ in LABELS]
        self.train()

    def vectorize(self, text: str) -> list[float]:
        tokens = tokenize(text)
        counts = {token: tokens.count(token) for token in set(tokens)}
        vector = [float(counts.get(token, 0)) for token in self.vocab]
        norm = math.sqrt(sum(value * value for value in vector)) or 1.0
        return [value / norm for value in vector]

    def train(self):
        xs = [self.vectorize(text) for text, _label in TRAINING_DATA]
        ys = [self.label_index[label] for _text, label in TRAINING_DATA]
        logistic_rate = 0.42
        svm_rate = 0.09
        reg = 0.002

        for _epoch in range(180):
            for x, y in zip(xs, ys):
                logits = [dot(weights, x) + self.logistic_b[i] for i, weights in enumerate(self.logistic_w)]
                probs = softmax(logits)
                for i in range(len(LABELS)):
                    error = probs[i] - (1 if i == y else 0)
                    for j, value in enumerate(x):
                        self.logistic_w[i][j] -= logistic_rate * (error * value + reg * self.logistic_w[i][j])
                    self.logistic_b[i] -= logistic_rate * error

                for i in range(len(LABELS)):
                    target = 1 if i == y else -1
                    margin = target * (dot(self.svm_w[i], x) + self.svm_b[i])
                    for j in range(len(x)):
                        self.svm_w[i][j] *= 1 - svm_rate * reg
                    if margin < 1:
                        for j, value in enumerate(x):
                            self.svm_w[i][j] += svm_rate * target * value
                        self.svm_b[i] += svm_rate * target

    def predict(self, text: str) -> Prediction:
        clean = " ".join((text or "").split())
        if not clean:
            return Prediction("", "neutral", 0.0, 0, 0, 100, 100, "neutral", "low", False, [])

        x = self.vectorize(clean)
        logistic_scores = [dot(weights, x) + self.logistic_b[i] for i, weights in enumerate(self.logistic_w)]
        svm_scores = [dot(weights, x) + self.svm_b[i] for i, weights in enumerate(self.svm_w)]
        blended_scores = [logistic_scores[i] + svm_scores[i] * 0.35 for i in range(len(LABELS))]
        probs = softmax(blended_scores)
        best = max(range(len(LABELS)), key=lambda i: probs[i])

        pos = round(probs[0] * 100)
        neg = round(probs[1] * 100)
        neu = max(0, 100 - pos - neg)
        compound = max(-1.0, min(1.0, (probs[0] - probs[1]) + (svm_scores[0] - svm_scores[1]) * 0.03))
        tokens = [token for token in tokenize(clean) if "_" not in token]
        token_set = set(tokens)
        emotion = "neutral"
        for words, label in EMOTION_TERMS:
            if token_set & words:
                emotion = label
                break

        return Prediction(
            text=clean,
            sentiment=LABELS[best],
            compound=round(compound, 3),
            pos=pos,
            neg=neg,
            neu=neu,
            confidence=max(45, min(98, round(probs[best] * 100))),
            emotion=emotion,
            intensity="high" if abs(compound) > 0.6 else "medium" if abs(compound) > 0.25 else "low",
            sarcasm=False,
            key_words=tokens[:4],
        )


MODEL = HashPulseMLModel()


def analyze_comment(text: str) -> dict:
    return MODEL.predict(text).to_dict()


def analyze_comments(comments: list[str]) -> list[dict]:
    return [analyze_comment(comment) for comment in comments if str(comment).strip()]
