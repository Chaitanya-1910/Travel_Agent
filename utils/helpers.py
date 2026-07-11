"""
Utility helper functions for the Travel Planner application.
"""
import uuid
import re
import html
from datetime import datetime


def format_currency(amount: float, currency: str = "USD") -> str:
    """Format a numeric amount as a currency string."""
    symbols = {"USD": "$", "EUR": "€", "GBP": "£", "INR": "₹", "JPY": "¥", "AUD": "A$"}
    symbol = symbols.get(currency, currency + " ")
    if currency == "JPY":
        return f"{symbol}{int(amount):,}"
    return f"{symbol}{amount:,.2f}"


def sanitize_input(text: str) -> str:
    """Sanitize user input to prevent XSS and injection attacks."""
    if not isinstance(text, str):
        return ""
    # Remove null bytes
    text = text.replace("\x00", "")
    # Escape HTML special characters
    text = html.escape(text.strip())
    # Limit length to prevent overly long inputs
    return text[:2000]


def generate_trip_id() -> str:
    """Generate a unique trip identifier."""
    return f"TRIP-{uuid.uuid4().hex[:8].upper()}"


def format_date_range(start_date: str, end_date: str) -> str:
    """Format a date range into a human-readable string."""
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
        delta = (end - start).days
        return f"{start.strftime('%b %d')} – {end.strftime('%b %d, %Y')} ({delta} days)"
    except (ValueError, TypeError):
        return f"{start_date} – {end_date}"


def parse_number(value, default=0):
    """Safely parse a number from various input types."""
    try:
        return float(str(value).replace(",", "").strip())
    except (ValueError, TypeError):
        return default


def slugify(text: str) -> str:
    """Convert a string to a URL-friendly slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text
