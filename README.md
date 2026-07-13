# ✈️ TravelAI — AI-Powered Travel Planner

> A premium, full-stack travel planning web application built with **Python Flask** and **IBM Watsonx.ai**. Plan personalised, AI-generated itineraries, budgets, hotel recommendations, and more — all in seconds.

![Python](https://img.shields.io/badge/Python-3.9+-blue?logo=python)
![Flask](https://img.shields.io/badge/Flask-3.0-black?logo=flask)
![IBM Watsonx](https://img.shields.io/badge/IBM-Watsonx.ai-0f62fe?logo=ibm)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-purple?logo=bootstrap)

---

## 📊 Project Presentation

> **[▶ Click here to view the Project Presentation (PowerPoint)](https://1drv.ms/p/c/A4838C68FB5A3A7A/IQCLoq1Tj8MvR6MwAhRswBYMARu40zpQihXHp_mEZkUADuM?e=A4rhi9)**

---

## ✨ Features

### 🤖 10 Specialised AI Agents
| Agent | Description |
|---|---|
| Destination Recommendation | Suggests perfect destinations based on interests & budget |
| Smart Itinerary Planner | Day-wise plans with morning, afternoon & evening activities |
| Budget Optimiser | Expense breakdowns, money-saving tips, realistic estimates |
| Transport Advisor | Flights, trains, buses, and cab options |
| Hotel Recommender | Budget to luxury stays with nightly rates |
| Weather & Safety | Climate forecasts, health tips, travel advisories |
| Local Guide | Attractions, hidden gems, cultural etiquette |
| Restaurant & Food | Authentic dining from street food to fine dining |
| Packing Checklist | Personalised lists based on destination and activities |
| Travel Chat Assistant | 24/7 conversational AI travel concierge |

### 💎 Premium UI Features
- Glassmorphism design with smooth animations
- Dark/light mode toggle
- Fully mobile-responsive layout
- Interactive destination cards
- Agent progress visualisation during planning
- PDF itinerary export
- Trip history with save/favourite/search
- Real-time character counter in chat
- Typing indicators with animated dots

---

## 🚀 Quick Start

> 📄 For a full plain-text walkthrough, see **[SETUP.txt](SETUP.txt)**

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/Travel_Agent.git
cd Travel_Agent
```

### 2. Create & Activate Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

Open `.env` and fill in **these three required values**:

```env
IBM_API_KEY=<your IBM Cloud API key>
IBM_PROJECT_ID=<your Watsonx.ai project ID>
IBM_URL=<your regional endpoint, e.g. https://eu-de.ml.cloud.ibm.com>
```

Everything else already has working defaults — no changes needed.

> ⚠️ **IBM_URL must match the region of your Watson Machine Learning (WML) service — not your Watsonx Studio project.** These can be in different regions. Find your WML region at: `cloud.ibm.com → Resource List → AI / Machine Learning → Watson Machine Learning`.

### 5. Run the Application
```bash
python app.py
```

Navigate to **http://localhost:5000** in your browser.

---

## 🔑 Getting IBM Watsonx.ai Credentials

1. **IBM Cloud Account** — Sign up at [cloud.ibm.com](https://cloud.ibm.com) (free tier works)
2. **API Key** — Go to **Manage → Access (IAM) → API Keys → Create** → copy your key immediately
3. **Watsonx.ai Project** — Open [dataplatform.cloud.ibm.com](https://dataplatform.cloud.ibm.com), create a project, copy the **Project ID** from **Manage → General**
4. **Regional URL** — Use the URL matching your IBM Cloud region:
   - US South: `https://us-south.ml.cloud.ibm.com`
   - EU DE: `https://eu-de.ml.cloud.ibm.com`
   - EU GB: `https://eu-gb.ml.cloud.ibm.com`
   - AP North: `https://jp-tok.ml.cloud.ibm.com`

> ⚠️ Make sure your `IBM_URL` region matches the region where your Watsonx.ai project was created.

---

## 📁 Project Structure

```
Travel_Agent/
├── app.py                      # Flask application & REST API endpoints
├── requirements.txt
├── SETUP.txt                   # Plain-text setup guide for new users
├── .env.example                # Environment variable template (safe to commit)
├── .env                        # Your secrets (never commit this!)
│
├── agents/
│   ├── __init__.py
│   └── travel_agents.py        # All 10 AI agents + AGENT_INSTRUCTIONS
│
├── utils/
│   ├── __init__.py
│   ├── helpers.py              # Utility functions
│   └── pdf_generator.py        # PDF export using fpdf2
│
├── templates/
│   ├── base.html               # Base layout (navbar, footer, toast)
│   ├── index.html              # Dashboard / landing page
│   ├── planner.html            # Trip planner form + results
│   ├── chat.html               # AI chat assistant
│   └── trips.html              # Saved trips management
│
└── static/
    ├── css/
    │   └── style.css           # Premium CSS (glassmorphism, dark mode, animations)
    └── js/
        ├── main.js             # Global utilities, theme, scroll animations
        ├── dashboard.js        # Dashboard logic
        ├── planner.js          # Planner form & results rendering
        ├── chat.js             # Chat interface
        └── trips.js            # Trips management
```

---

## ⚙️ Customising AI Behaviour

All agent behaviour is controlled via the `AGENT_INSTRUCTIONS` dictionary in [`agents/travel_agents.py`](agents/travel_agents.py). **No other code changes are needed.**

```python
AGENT_INSTRUCTIONS = {
    "persona":            "...",   # AI personality & expertise
    "response_style":     "...",   # Formatting & tone
    "budget_philosophy":  "...",   # Budget optimisation strategy
    "safety_guidelines":  "...",   # Safety & travel advisories
    "itinerary_style":    "...",   # Day-wise planning format
    "accommodation_style":"...",   # Hotel recommendation format
    "food_philosophy":    "...",   # Dining recommendation style
    "personalisation":    "...",   # Personalisation rules
    "culture_guidance":   "...",   # Culture & etiquette guidance
    "chat_rules":         "...",   # Chat assistant behaviour
}
```

---

## ⚠️ Token Quota Note

IBM Watsonx.ai free tier has a **monthly token quota per model**. If you see a `token_quota_reached` error:

1. Try switching `IBM_MODEL_ID` in `.env` to a different model — each model has its own separate quota
2. If all models are exhausted, wait for the quota to reset on the **1st of the month**
3. Or upgrade to Pay-As-You-Go at [cloud.ibm.com](https://cloud.ibm.com) → Billing

**Recommended models to try (in order):**
```
meta-llama/llama-3-3-70b-instruct              ← default, best quality
meta-llama/llama-4-maverick-17b-128e-instruct-fp8
mistralai/mistral-small-3-1-24b-instruct-2503
```

---

## 🌐 REST API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/health` | Health check |
| `POST` | `/api/destinations` | Destination recommendations |
| `POST` | `/api/plan-trip` | Full trip plan (all 8 agents) |
| `POST` | `/api/chat` | AI chat conversation |
| `GET`  | `/api/trips` | List all trips |
| `GET`  | `/api/trips/<id>` | Get specific trip |
| `POST` | `/api/trips/<id>/save` | Toggle save status |
| `POST` | `/api/trips/<id>/favorite` | Toggle favourite status |
| `GET`  | `/api/trips/<id>/export-pdf` | Download PDF itinerary |
| `DELETE`| `/api/trips/<id>` | Delete trip |

---

## 🚢 Production Deployment

### Option A: Gunicorn (Linux/macOS)
```bash
pip install gunicorn
gunicorn app:app -w 4 -b 0.0.0.0:8000
```

### Option B: Docker
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["gunicorn", "app:app", "-w", "4", "-b", "0.0.0.0:5000"]
```

```bash
docker build -t travelai .
docker run -p 5000:5000 --env-file .env travelai
```

### Option C: IBM Code Engine
```bash
ibmcloud ce application create \
  --name travelai \
  --image icr.io/<namespace>/travelai \
  --env-from-secret travelai-secrets \
  --port 5000
```

### Environment Variables for Production
```
IBM_API_KEY=...
IBM_PROJECT_ID=...
IBM_URL=https://eu-de.ml.cloud.ibm.com
IBM_MODEL_ID=mistralai/mistral-small-3-1-24b-instruct-2503
FLASK_SECRET_KEY=<strong-random-key>
FLASK_ENV=production
FLASK_DEBUG=False
```

---

## 🔒 Security Notes

- **Never** commit `.env` to version control — it's in `.gitignore`
- `FLASK_SECRET_KEY` must be a long random string in production
- All user inputs are sanitised via `sanitize_input()` before being sent to the AI
- HTML is escaped in JavaScript to prevent XSS

---

## 🤝 Tech Stack

| Layer | Technology |
|---|---|
| AI Engine | IBM Watsonx.ai (Llama 3.3 70B / configurable) |
| Backend | Python 3.9+ / Flask 3.0 |
| PDF Export | fpdf2 |
| Frontend | Bootstrap 5.3 + Custom CSS |
| Icons | Font Awesome 6 |
| Fonts | Inter + Playfair Display |
| Env Management | python-dotenv |

---

## 📝 License

MIT License — Free to use, modify and distribute.

---

<p align="center">Made with ❤️ using IBM Watsonx.ai</p>
