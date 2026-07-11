"""
Travel Planner AI Agents — powered by IBM Watsonx.ai (IBM Granite)
==================================================================
This module defines all 10 specialised travel planning agents and the
TravelAgentOrchestrator that coordinates them.

To customise agent behaviour, edit the AGENT_INSTRUCTIONS dictionary below.
No other part of the application needs to change.
"""

from __future__ import annotations
import os
import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional
from ibm_watsonx_ai import Credentials
from ibm_watsonx_ai.foundation_models import ModelInference
from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams

logger = logging.getLogger(__name__)

# ══════════════════════════════════════════════════════════════════════════════
# AGENT INSTRUCTIONS — Customise AI behaviour here without touching core logic
# ══════════════════════════════════════════════════════════════════════════════
AGENT_INSTRUCTIONS = {
    # ── Global persona ────────────────────────────────────────────────────────
    "persona": (
        "You are an expert AI Travel Planner with 20+ years of global travel "
        "consulting experience. You provide highly personalised, detailed, and "
        "actionable travel advice. Your tone is warm, professional, and "
        "enthusiastic about travel. You always prioritise traveller safety, "
        "value for money, and memorable experiences."
    ),

    # ── Response style ────────────────────────────────────────────────────────
    "response_style": (
        "Always structure responses with clear headings and bullet points. "
        "Use emojis sparingly for readability. Provide specific names, prices "
        "(in USD unless asked otherwise), and practical tips. Be concise but "
        "comprehensive. Never give vague generic advice."
    ),

    # ── Budget philosophy ─────────────────────────────────────────────────────
    "budget_philosophy": (
        "Optimise for maximum value within the stated budget. Always show a "
        "budget breakdown with percentage allocation per category. Flag any "
        "costs that are often overlooked (visa, travel insurance, tips). "
        "Provide budget, mid-range, and luxury options when budget is flexible."
    ),

    # ── Safety guidelines ─────────────────────────────────────────────────────
    "safety_guidelines": (
        "Always include destination-specific safety tips. Mention travel "
        "advisories if a destination has known risks. Recommend travel "
        "insurance for all international trips. Include emergency contact "
        "numbers (local police, hospital, embassy) for the destination."
    ),

    # ── Itinerary style ───────────────────────────────────────────────────────
    "itinerary_style": (
        "Create day-wise itineraries with morning, afternoon, and evening "
        "activities. Include realistic travel times between locations. Balance "
        "popular tourist spots with hidden gems. Always include at least one "
        "unique local experience per day. Factor in rest time and flexibility."
    ),

    # ── Accommodation preferences ─────────────────────────────────────────────
    "accommodation_style": (
        "Recommend 3 hotel options per budget category (budget/mid/luxury). "
        "Include approximate nightly rates, star ratings, key amenities, and "
        "proximity to main attractions. Mention booking platforms and best "
        "booking times for deals."
    ),

    # ── Food & dining philosophy ──────────────────────────────────────────────
    "food_philosophy": (
        "Prioritise authentic local cuisine over tourist-oriented restaurants. "
        "Always include at least one street food experience. Recommend "
        "restaurants across price points. Note dietary restriction "
        "considerations (vegetarian, vegan, halal, gluten-free) when relevant."
    ),

    # ── Personalisation rules ─────────────────────────────────────────────────
    "personalisation": (
        "Tailor every recommendation to the traveller's stated interests, "
        "age group, travel style, and companion type (solo, couple, family, "
        "group). If travelling with children, suggest family-friendly options "
        "and avoid nightlife-heavy recommendations."
    ),

    # ── Language & culture guidance ───────────────────────────────────────────
    "culture_guidance": (
        "Include key cultural norms, etiquette tips, dress code requirements, "
        "and local customs. Provide 5–10 essential phrases in the local "
        "language. Mention religious or public holidays that may affect "
        "availability or access to attractions."
    ),

    # ── Chat assistant rules ──────────────────────────────────────────────────
    "chat_rules": (
        "Answer travel questions conversationally. If the user asks about a "
        "specific topic, provide detailed and actionable information. Ask "
        "clarifying questions if the request is ambiguous. Always end with a "
        "helpful follow-up suggestion or question to keep the conversation "
        "productive."
    ),
}
# ══════════════════════════════════════════════════════════════════════════════


class WatsonxClient:
    """
    Singleton wrapper around the IBM Watsonx.ai ModelInference client.
    Lazily initialised on first use.
    """
    _instance: Optional["WatsonxClient"] = None
    _model: Optional[ModelInference] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def get_model(self) -> ModelInference:
        """Return (or create) the shared ModelInference instance."""
        if self._model is None:
            api_key = os.getenv("IBM_API_KEY", "")
            project_id = os.getenv("IBM_PROJECT_ID", "")
            url = os.getenv("IBM_URL", "https://us-south.ml.cloud.ibm.com")
            model_id = os.getenv("IBM_MODEL_ID", "ibm/granite-3-8b-instruct")

            if not api_key or not project_id:
                raise EnvironmentError(
                    "IBM_API_KEY and IBM_PROJECT_ID must be set in the .env file."
                )

            credentials = Credentials(url=url, api_key=api_key)
            self._model = ModelInference(
                model_id=model_id,
                credentials=credentials,
                project_id=project_id,
                params={
                    GenParams.MAX_NEW_TOKENS: 1200,
                    GenParams.MIN_NEW_TOKENS: 50,
                    GenParams.TEMPERATURE: 0.7,
                    GenParams.TOP_P: 0.9,
                    GenParams.REPETITION_PENALTY: 1.1,
                },
            )
            logger.info("IBM Watsonx.ai ModelInference client initialised. Model: %s", model_id)
        return self._model

    def generate(self, prompt: str, max_tokens: int = 900) -> str:
        """Generate text from a prompt, returning the result string."""
        for attempt in range(5):
            try:
                model = self.get_model()
                response = model.generate_text(
                    prompt=prompt,
                    params={GenParams.MAX_NEW_TOKENS: max_tokens},
                )
                return response.strip() if isinstance(response, str) else str(response)
            except Exception as exc:
                if "429" in str(exc) and attempt < 4:
                    wait = 2 + (attempt * 3)   # 2s, 5s, 8s, 11s
                    logger.warning("Rate limited (429), retrying in %ds (attempt %d/5)…", wait, attempt + 1)
                    time.sleep(wait)
                else:
                    logger.error("Watsonx generation error: %s", exc)
                    raise


# Shared client instance
_client = WatsonxClient()


def _build_prompt(system_context: str, user_request: str) -> str:
    """Assemble a Llama-style prompt with system and user sections."""
    persona = AGENT_INSTRUCTIONS["persona"]
    style = AGENT_INSTRUCTIONS["response_style"]
    return (
        f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n"
        f"{persona}\n\n{style}\n\n{system_context}<|eot_id|>"
        f"<|start_header_id|>user<|end_header_id|>\n"
        f"{user_request}<|eot_id|>"
        f"<|start_header_id|>assistant<|end_header_id|>\n"
    )


# ── Individual Agent Functions ────────────────────────────────────────────────

def destination_recommendation_agent(preferences: dict) -> str:
    """Agent 1 — Recommend destinations based on traveller preferences."""
    interests = preferences.get("interests", "general sightseeing")
    budget = preferences.get("budget", "moderate")
    duration = preferences.get("duration", "7 days")
    travel_style = preferences.get("travel_style", "leisure")
    from_location = preferences.get("from_location", "")

    system_ctx = (
        "You are a world-class destination expert. Recommend the best travel "
        "destinations with detailed reasoning for each recommendation. "
        "Always use realistic local pricing — for Indian destinations quote prices "
        "in INR (₹), for US destinations in USD, etc. Never suggest luxury international "
        "hotel rates for budget local destinations."
    )
    user_req = (
        f"Recommend 5 top travel destinations for a traveller with:\n"
        f"- Interests: {interests}\n"
        f"- Budget: {budget}\n"
        f"- Trip duration: {duration}\n"
        f"- Travel style: {travel_style}\n"
        f"- Departing from: {from_location or 'not specified'}\n\n"
        "For each destination provide: name, why it matches the profile, "
        "best time to visit, approximate total cost, and a highlight activity."
    )
    return _client.generate(_build_prompt(system_ctx, user_req))


def itinerary_planning_agent(trip_details: dict) -> str:
    """Agent 2 — Generate a detailed day-wise itinerary."""
    destination = trip_details.get("destination", "Unknown")
    duration = trip_details.get("duration", "7 days")
    interests = trip_details.get("interests", "sightseeing, culture, food")
    travelers = trip_details.get("travelers", 2)
    travel_style = trip_details.get("travel_style", "balanced")
    start_date = trip_details.get("start_date", "")

    itinerary_instructions = AGENT_INSTRUCTIONS["itinerary_style"]
    system_ctx = f"You are a master itinerary planner. {itinerary_instructions}"
    user_req = (
        f"Create a complete day-wise itinerary for ALL {duration} for:\n"
        f"- Destination: {destination}\n"
        f"- Duration: {duration}\n"
        f"- Travellers: {travelers}\n"
        f"- Interests: {interests}\n"
        f"- Travel style: {travel_style}\n"
        f"- Start date: {start_date or 'flexible'}\n\n"
        f"IMPORTANT: Cover every single day from Day 1 to the last day. Do not stop early.\n"
        f"Use realistic LOCAL pricing in the local currency (e.g. INR ₹ for India, "
        f"USD $ for USA). For Indian cities, budget hotels cost ₹1500-4000/night, "
        f"mid-range ₹4000-8000/night. Do not use international luxury rates.\n"
        "Structure: For each day provide Morning, Afternoon, Evening activities "
        "with specific place names, estimated duration, travel tips, and entry fees."
    )
    return _client.generate(_build_prompt(system_ctx, user_req), max_tokens=900)


def budget_planning_agent(trip_details: dict) -> str:
    """Agent 3 — Generate a detailed budget plan with expense breakdown."""
    destination = trip_details.get("destination", "Unknown")
    duration = trip_details.get("duration", "7 days")
    budget = trip_details.get("budget", "1000")
    travelers = trip_details.get("travelers", 2)
    accommodation_pref = trip_details.get("accommodation", "mid-range hotel")

    budget_instructions = AGENT_INSTRUCTIONS["budget_philosophy"]
    system_ctx = f"You are an expert travel budget consultant. {budget_instructions}"
    user_req = (
        f"Create a detailed travel budget plan for:\n"
        f"- Destination: {destination}\n"
        f"- Duration: {duration}\n"
        f"- Total budget: {budget}\n"
        f"- Number of travellers: {travelers}\n"
        f"- Accommodation preference: {accommodation_pref}\n\n"
        f"IMPORTANT: Use realistic LOCAL pricing. For Indian destinations quote in INR (₹) — "
        f"budget hotels ₹1500-3000/night, mid-range ₹3000-7000/night, food ₹100-400/meal. "
        f"For Western destinations use USD. Never apply international luxury rates to local destinations.\n"
        "Provide: category-wise breakdown (hotels, food, activities, "
        "transport, shopping, misc), daily budget, money-saving tips, and "
        "whether the budget is realistic for the destination."
    )
    return _client.generate(_build_prompt(system_ctx, user_req))


def transportation_recommendation_agent(trip_details: dict) -> str:
    """Agent 4 — Recommend transportation options (flight, train, bus, cab)."""
    destination = trip_details.get("destination", "Unknown")
    from_location = trip_details.get("from_location", "")
    budget = trip_details.get("budget_transport", "moderate")
    travel_date = trip_details.get("start_date", "")

    system_ctx = (
        "You are a transportation expert specialising in multi-modal travel. "
        "Provide detailed, practical transportation recommendations."
    )
    user_req = (
        f"Recommend transportation options for travelling to {destination}"
        f"{f' from {from_location}' if from_location else ''}:\n"
        f"- Budget level: {budget}\n"
        f"- Travel date: {travel_date or 'flexible'}\n\n"
        "Cover: Flights (airlines, booking tips, price range), Trains "
        "(routes, duration, class options), Buses (services, duration), "
        "Airport/local taxis and rideshares, Car rental options, "
        "and local transportation within the destination."
    )
    return _client.generate(_build_prompt(system_ctx, user_req))


def hotel_recommendation_agent(trip_details: dict) -> str:
    """Agent 5 — Recommend hotels and accommodations."""
    destination = trip_details.get("destination", "Unknown")
    budget = trip_details.get("budget", "moderate")
    duration = trip_details.get("duration", "7 days")
    travelers = trip_details.get("travelers", 2)
    accommodation_pref = trip_details.get("accommodation", "hotel")

    accommodation_instructions = AGENT_INSTRUCTIONS["accommodation_style"]
    system_ctx = f"You are an expert hotel concierge. {accommodation_instructions}"
    user_req = (
        f"Recommend accommodations in {destination} for:\n"
        f"- Budget: {budget}\n"
        f"- Duration: {duration}\n"
        f"- Travellers: {travelers}\n"
        f"- Preferred type: {accommodation_pref}\n\n"
        f"IMPORTANT: Use realistic LOCAL pricing in local currency. "
        f"For Indian cities like Vijayawada, Hyderabad, Chennai etc: "
        f"budget hotels ₹1000-2500/night, mid-range ₹2500-6000/night, luxury ₹6000-15000/night. "
        f"Never suggest international 5-star rates for tier-2 Indian cities.\n"
        "List 3 options each for budget, mid-range, and luxury categories. "
        "Include: hotel name, approximate nightly rate in LOCAL currency, star rating, "
        "best neighbourhood to stay, key amenities, and booking tips."
    )
    return _client.generate(_build_prompt(system_ctx, user_req))


def weather_advisory_agent(trip_details: dict) -> str:
    """Agent 6 — Provide weather forecast and travel advisory."""
    destination = trip_details.get("destination", "Unknown")
    travel_dates = trip_details.get("travel_dates", "")
    duration = trip_details.get("duration", "7 days")

    safety_instructions = AGENT_INSTRUCTIONS["safety_guidelines"]
    system_ctx = (
        "You are a climate and travel safety expert. "
        f"{safety_instructions}"
    )
    user_req = (
        f"Provide weather and travel advisory for {destination}:\n"
        f"- Travel dates: {travel_dates or 'not specified'}\n"
        f"- Duration: {duration}\n\n"
        "Include: expected weather conditions, temperature range, packing "
        "weather tips, travel advisories, health precautions, visa requirements "
        "overview, emergency contacts, and overall safety rating."
    )
    return _client.generate(_build_prompt(system_ctx, user_req))


def local_guide_agent(trip_details: dict) -> str:
    """Agent 7 — Provide a local guide with attractions and hidden gems."""
    destination = trip_details.get("destination", "Unknown")
    interests = trip_details.get("interests", "culture, history, nature")
    duration = trip_details.get("duration", "7 days")

    culture_instructions = AGENT_INSTRUCTIONS["culture_guidance"]
    system_ctx = (
        "You are an expert local guide with deep knowledge of destinations "
        f"worldwide. {culture_instructions}"
    )
    user_req = (
        f"Create a local guide for {destination}:\n"
        f"- Visitor interests: {interests}\n"
        f"- Trip duration: {duration}\n\n"
        "Include: Top 10 must-see attractions (with entry fees and best visiting "
        "times), 5 hidden gems locals love, cultural etiquette tips, local "
        "language phrases, neighbourhoods to explore, best local markets, "
        "and unique experiences unavailable elsewhere."
    )
    return _client.generate(_build_prompt(system_ctx, user_req))


def restaurant_recommendation_agent(trip_details: dict) -> str:
    """Agent 8 — Recommend restaurants and dining experiences."""
    destination = trip_details.get("destination", "Unknown")
    dietary = trip_details.get("dietary", "no restrictions")
    budget = trip_details.get("budget", "moderate")
    interests = trip_details.get("interests", "local cuisine")

    food_instructions = AGENT_INSTRUCTIONS["food_philosophy"]
    system_ctx = f"You are a world-renowned food critic and culinary travel expert. {food_instructions}"
    user_req = (
        f"Recommend restaurants and dining experiences in {destination}:\n"
        f"- Dietary requirements: {dietary}\n"
        f"- Budget level: {budget}\n"
        f"- Food interests: {interests}\n\n"
        "Include: Must-try local dishes, 5 budget restaurants (under $15/meal), "
        "5 mid-range restaurants ($15–50/meal), 3 fine dining options, "
        "best street food spots, local food markets, signature dishes to try, "
        "and dining etiquette tips."
    )
    return _client.generate(_build_prompt(system_ctx, user_req))


def packing_checklist_agent(trip_details: dict) -> str:
    """Agent 9 — Generate a personalised packing checklist."""
    destination = trip_details.get("destination", "Unknown")
    duration = trip_details.get("duration", "7 days")
    trip_type = trip_details.get("trip_style", "leisure")
    weather = trip_details.get("weather", "moderate")
    travelers = trip_details.get("travelers", 1)
    activities = trip_details.get("interests", "sightseeing")

    system_ctx = (
        "You are a professional travel packing expert. "
        "Create detailed, practical packing checklists tailored to specific trips."
    )
    user_req = (
        f"Create a comprehensive packing checklist for:\n"
        f"- Destination: {destination}\n"
        f"- Duration: {duration}\n"
        f"- Trip type: {trip_type}\n"
        f"- Expected weather: {weather}\n"
        f"- Travellers: {travelers}\n"
        f"- Planned activities: {activities}\n\n"
        "Organise by category: Documents & Money, Clothing (with count "
        "recommendations), Toiletries, Electronics, Health & Safety, "
        "Destination-specific items, and Smart packing tips."
    )
    return _client.generate(_build_prompt(system_ctx, user_req))


def travel_chat_agent(message: str, conversation_history: list) -> str:
    """Agent 10 — Conversational travel assistant for Q&A."""
    chat_instructions = AGENT_INSTRUCTIONS["chat_rules"]
    persona = AGENT_INSTRUCTIONS["persona"]

    # Build conversation context from history (last 6 exchanges)
    history_ctx = ""
    recent_history = conversation_history[-6:] if len(conversation_history) > 6 else conversation_history
    for entry in recent_history:
        role = entry.get("role", "user")
        content = entry.get("content", "")
        if role == "user":
            history_ctx += f"<|start_header_id|>user<|end_header_id|>\n{content}<|eot_id|>"
        else:
            history_ctx += f"<|start_header_id|>assistant<|end_header_id|>\n{content}<|eot_id|>"

    prompt = (
        f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n"
        f"{persona}\n\n{chat_instructions}<|eot_id|>"
        f"{history_ctx}"
        f"<|start_header_id|>user<|end_header_id|>\n{message}<|eot_id|>"
        f"<|start_header_id|>assistant<|end_header_id|>\n"
    )
    return _client.generate(prompt, max_tokens=800)


# ── Orchestrator ──────────────────────────────────────────────────────────────

class TravelAgentOrchestrator:
    """
    Coordinates all 10 travel planning agents to produce a complete trip plan.

    Usage:
        orchestrator = TravelAgentOrchestrator()
        result = orchestrator.plan_trip(trip_data)
        answer = orchestrator.chat(message, history)
    """

    def plan_trip(self, trip_data: dict) -> dict:
        """
        Run all 8 agents in parallel using a thread pool.

        Args:
            trip_data: User's trip preferences and requirements.

        Returns:
            Dictionary with results from each agent.
        """
        results: dict = {}
        errors: dict = {}

        agents_to_run = [
            ("itinerary",       itinerary_planning_agent),
            ("budget_plan",     budget_planning_agent),
            ("transportation",  transportation_recommendation_agent),
            ("hotels",          hotel_recommendation_agent),
            ("weather",         weather_advisory_agent),
            ("local_guide",     local_guide_agent),
            ("restaurants",     restaurant_recommendation_agent),
            ("packing",         packing_checklist_agent),
        ]

        def _run_agent(key: str, agent_fn, delay: float):
            """Run a single agent with an initial stagger delay."""
            if delay > 0:
                time.sleep(delay)
            logger.info("Running agent: %s", key)
            return key, agent_fn(trip_data)

        # Stagger thread launches by 0.4s each to avoid simultaneous API hits
        with ThreadPoolExecutor(max_workers=8) as pool:
            futures = {
                pool.submit(_run_agent, key, fn, idx * 0.4): key
                for idx, (key, fn) in enumerate(agents_to_run)
            }
            for future in as_completed(futures):
                try:
                    key, result = future.result()
                    results[key] = result
                except Exception as exc:
                    key = futures[future]
                    logger.error("Agent '%s' failed: %s", key, exc, exc_info=True)
                    errors[key] = str(exc)
                    results[key] = f"Unable to generate {key} plan at this time. Please try again."

        if errors:
            results["_errors"] = errors

        return results

    def get_destination_recommendations(self, preferences: dict) -> str:
        """Run destination recommendation agent."""
        return destination_recommendation_agent(preferences)

    def chat(self, message: str, history: list) -> str:
        """Run conversational travel assistant agent."""
        return travel_chat_agent(message, history)
