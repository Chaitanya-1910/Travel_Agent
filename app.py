"""
AI Travel Planner — Flask Application Entry Point
=================================================
Provides all REST API endpoints consumed by the frontend and coordinates
the IBM Watsonx.ai powered travel planning agents.

Run:
    python app.py               (development)
    gunicorn app:app -w 4       (production)
"""

from __future__ import annotations

import io
import json
import logging
import os
from datetime import datetime

from dotenv import load_dotenv
from flask import (
    Flask,
    jsonify,
    render_template,
    request,
    send_file,
    session,
)

# Load environment variables from .env before anything else
load_dotenv()

from agents import TravelAgentOrchestrator
from utils import generate_itinerary_pdf, generate_trip_id, sanitize_input

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ── Flask Application ─────────────────────────────────────────────────────────
app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", os.urandom(32).hex())

# In-memory trip store (replace with a database in production)
_trip_store: dict[str, dict] = {}

# Shared orchestrator instance
orchestrator = TravelAgentOrchestrator()


# ── Page Routes ───────────────────────────────────────────────────────────────

@app.route("/")
def index():
    """Dashboard / landing page."""
    return render_template("index.html")


@app.route("/planner")
def planner():
    """Trip planner page."""
    return render_template("planner.html")


@app.route("/chat")
def chat_page():
    """AI travel chat assistant page."""
    return render_template("chat.html")


@app.route("/trips")
def trips_page():
    """Saved trips page."""
    return render_template("trips.html")


# ── API Endpoints ─────────────────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "model": os.getenv("IBM_MODEL_ID", "meta-llama/llama-3-3-70b-instruct"),
        "version": "1.0.0",
    })


@app.route("/api/destinations", methods=["POST"])
def get_destinations():
    """
    Get AI-powered destination recommendations.

    Request body:
        {
            "interests":    str,   # e.g. "beaches, hiking, history"
            "budget":       str,   # e.g. "moderate", "$2000"
            "duration":     str,   # e.g. "7 days"
            "travel_style": str,   # e.g. "adventure", "relaxation"
            "from_location":str    # optional
        }
    """
    data = request.get_json(silent=True) or {}
    preferences = {
        "interests":    sanitize_input(data.get("interests", "general sightseeing")),
        "budget":       sanitize_input(data.get("budget", "moderate")),
        "duration":     sanitize_input(data.get("duration", "7 days")),
        "travel_style": sanitize_input(data.get("travel_style", "leisure")),
        "from_location":sanitize_input(data.get("from_location", "")),
    }

    try:
        recommendations = orchestrator.get_destination_recommendations(preferences)
        return jsonify({"success": True, "recommendations": recommendations})
    except EnvironmentError as exc:
        return jsonify({"success": False, "error": str(exc)}), 503
    except Exception as exc:
        logger.error("Destination recommendations error: %s", exc)
        return jsonify({"success": False, "error": "Failed to get recommendations. Please try again."}), 500


@app.route("/api/plan-trip", methods=["POST"])
def plan_trip():
    """
    Generate a complete trip plan using all AI agents.

    Request body:
        {
            "destination":    str,
            "from_location":  str (optional),
            "start_date":     str (YYYY-MM-DD),
            "end_date":       str (YYYY-MM-DD),
            "duration":       str,
            "travelers":      int,
            "budget":         str,
            "interests":      str,
            "travel_style":   str,
            "accommodation":  str,
            "dietary":        str,
            "weather":        str (optional)
        }
    """
    data = request.get_json(silent=True) or {}

    # Sanitise all string inputs
    trip_data = {
        "destination":    sanitize_input(data.get("destination", "")),
        "from_location":  sanitize_input(data.get("from_location", "")),
        "start_date":     sanitize_input(data.get("start_date", "")),
        "end_date":       sanitize_input(data.get("end_date", "")),
        "duration":       sanitize_input(data.get("duration", "7 days")),
        "travelers":      int(data.get("travelers", 2)),
        "budget":         sanitize_input(data.get("budget", "moderate")),
        "interests":      sanitize_input(data.get("interests", "sightseeing, culture")),
        "travel_style":   sanitize_input(data.get("travel_style", "leisure")),
        "accommodation":  sanitize_input(data.get("accommodation", "hotel")),
        "dietary":        sanitize_input(data.get("dietary", "no restrictions")),
        "weather":        sanitize_input(data.get("weather", "moderate")),
        "travel_dates":   f"{data.get('start_date', '')} to {data.get('end_date', '')}",
        "budget_transport": sanitize_input(data.get("budget", "moderate")),
        "trip_style":     sanitize_input(data.get("travel_style", "leisure")),
    }

    if not trip_data["destination"]:
        return jsonify({"success": False, "error": "Destination is required."}), 400

    try:
        results = orchestrator.plan_trip(trip_data)

        # Persist trip to in-memory store
        trip_id = generate_trip_id()
        _trip_store[trip_id] = {
            "trip_id":    trip_id,
            "details":    trip_data,
            "results":    results,
            "created_at": datetime.utcnow().isoformat(),
            "saved":      False,
            "favorite":   False,
        }

        return jsonify({
            "success": True,
            "trip_id": trip_id,
            "results": results,
            "trip_details": trip_data,
        })

    except EnvironmentError as exc:
        return jsonify({"success": False, "error": str(exc)}), 503
    except Exception as exc:
        logger.error("Trip planning error: %s", exc)
        return jsonify({"success": False, "error": "Failed to plan trip. Please try again."}), 500


@app.route("/api/chat", methods=["POST"])
def chat():
    """
    AI travel chat assistant endpoint.

    Request body:
        {
            "message":  str,
            "history":  list[{"role": "user"|"assistant", "content": str}]
        }
    """
    data = request.get_json(silent=True) or {}
    message = sanitize_input(data.get("message", ""))
    history = data.get("history", [])

    if not message:
        return jsonify({"success": False, "error": "Message is required."}), 400

    # Keep history manageable
    if len(history) > 20:
        history = history[-20:]

    try:
        reply = orchestrator.chat(message, history)
        return jsonify({"success": True, "reply": reply})
    except EnvironmentError as exc:
        return jsonify({"success": False, "error": str(exc)}), 503
    except Exception as exc:
        logger.error("Chat error: %s", exc, exc_info=True)
        debug = os.getenv("FLASK_DEBUG", "False").lower() == "true"
        error_msg = str(exc) if debug else "Chat service unavailable. Please try again."
        return jsonify({"success": False, "error": error_msg}), 500


@app.route("/api/trips", methods=["GET"])
def get_trips():
    """Return all saved trips."""
    trips = [
        {
            "trip_id":    t["trip_id"],
            "destination": t["details"].get("destination", ""),
            "start_date":  t["details"].get("start_date", ""),
            "end_date":    t["details"].get("end_date", ""),
            "duration":    t["details"].get("duration", ""),
            "travelers":   t["details"].get("travelers", 1),
            "budget":      t["details"].get("budget", ""),
            "created_at":  t["created_at"],
            "saved":       t.get("saved", False),
            "favorite":    t.get("favorite", False),
        }
        for t in _trip_store.values()
    ]
    return jsonify({"success": True, "trips": trips})


@app.route("/api/trips/<trip_id>", methods=["GET"])
def get_trip(trip_id: str):
    """Return a specific trip by ID."""
    trip = _trip_store.get(trip_id)
    if not trip:
        return jsonify({"success": False, "error": "Trip not found."}), 404
    return jsonify({"success": True, "trip": trip})


@app.route("/api/trips/<trip_id>/save", methods=["POST"])
def save_trip(trip_id: str):
    """Toggle the saved status of a trip."""
    trip = _trip_store.get(trip_id)
    if not trip:
        return jsonify({"success": False, "error": "Trip not found."}), 404
    trip["saved"] = not trip.get("saved", False)
    return jsonify({"success": True, "saved": trip["saved"]})


@app.route("/api/trips/<trip_id>/favorite", methods=["POST"])
def toggle_favorite(trip_id: str):
    """Toggle the favorite status of a trip."""
    trip = _trip_store.get(trip_id)
    if not trip:
        return jsonify({"success": False, "error": "Trip not found."}), 404
    trip["favorite"] = not trip.get("favorite", False)
    return jsonify({"success": True, "favorite": trip["favorite"]})


@app.route("/api/trips/<trip_id>/export-pdf", methods=["GET"])
def export_pdf(trip_id: str):
    """Export trip itinerary as a downloadable PDF."""
    trip = _trip_store.get(trip_id)
    if not trip:
        return jsonify({"success": False, "error": "Trip not found."}), 404

    try:
        pdf_data = {
            **trip["details"],
            "itinerary":      trip["results"].get("itinerary", ""),
            "budget_plan":    trip["results"].get("budget_plan", ""),
            "hotels":         trip["results"].get("hotels", ""),
            "transportation": trip["results"].get("transportation", ""),
            "packing":        trip["results"].get("packing", ""),
        }
        pdf_bytes = generate_itinerary_pdf(pdf_data)
        destination = trip["details"].get("destination", "trip").replace(" ", "_")
        filename = f"travel_plan_{destination}_{trip_id}.pdf"

        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype="application/pdf",
            as_attachment=True,
            download_name=filename,
        )
    except Exception as exc:
        logger.exception("PDF export error for trip %s: %s", trip_id, exc)
        return jsonify({"success": False, "error": "Failed to generate PDF."}), 500


@app.route("/api/trips/<trip_id>", methods=["DELETE"])
def delete_trip(trip_id: str):
    """Delete a trip by ID."""
    if trip_id not in _trip_store:
        return jsonify({"success": False, "error": "Trip not found."}), 404
    del _trip_store[trip_id]
    return jsonify({"success": True, "message": "Trip deleted."})


# ── Error Handlers ────────────────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(_):
    return render_template("index.html"), 404


@app.errorhandler(500)
def server_error(exc):
    logger.error("Server error: %s", exc)
    return jsonify({"success": False, "error": "Internal server error."}), 500


# ── Entry Point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.getenv("FLASK_PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "True").lower() == "true"
    logger.info("Starting AI Travel Planner on port %d (debug=%s)", port, debug)
    # threaded=True lets each request run in its own thread so long AI calls
    # don't block the health-check or other endpoints.
    app.run(host="0.0.0.0", port=port, debug=debug, threaded=True)
