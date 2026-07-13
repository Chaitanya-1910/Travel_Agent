from fpdf import FPDF, XPos, YPos

pdf = FPDF()
pdf.add_page()
pdf.set_margins(15, 15, 15)

# Title
pdf.set_font("Helvetica", "B", 16)
pdf.set_text_color(0, 0, 128)
pdf.cell(0, 12, "Problem Statement No. 5", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
pdf.cell(0, 12, "Travel Planner Agent", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
pdf.ln(3)
pdf.set_draw_color(0, 0, 128)
pdf.set_line_width(0.8)
pdf.line(15, pdf.get_y(), 195, pdf.get_y())
pdf.ln(6)

# The Challenge
pdf.set_font("Helvetica", "B", 12)
pdf.set_text_color(0, 0, 0)
pdf.cell(0, 10, "The Challenge", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.set_font("Helvetica", "", 11)
pdf.set_text_color(50, 50, 50)
challenge = (
    "A Travel Planner Agent is an AI-powered assistant that helps users plan trips "
    "efficiently and intelligently. It uses real-time data to suggest destinations, "
    "build itineraries, and recommend transport and accommodation options. "
    "By understanding user preferences, budgets, and constraints, it tailors "
    "personalized travel plans. Integrated with maps, weather updates, and local "
    "guides, it ensures a smooth travel experience. The agent can also manage "
    "bookings, alert users to changes, and optimize schedules on the go. "
    "This smart assistant transforms complex travel planning into a seamless, "
    "enjoyable process."
)
pdf.multi_cell(0, 7, challenge)
pdf.ln(4)
pdf.set_draw_color(0, 0, 128)
pdf.line(15, pdf.get_y(), 195, pdf.get_y())
pdf.ln(6)

# Technology
pdf.set_font("Helvetica", "B", 12)
pdf.set_text_color(0, 0, 0)
pdf.cell(0, 10, "Technology", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.set_font("Helvetica", "", 11)
pdf.set_text_color(50, 50, 50)
pdf.multi_cell(0, 7, "Use of IBM Cloud Lite services / IBM Granite is mandatory.")
pdf.ln(4)
pdf.set_draw_color(0, 0, 128)
pdf.line(15, pdf.get_y(), 195, pdf.get_y())
pdf.ln(6)

# Our Solution
pdf.set_font("Helvetica", "B", 12)
pdf.set_text_color(0, 0, 0)
pdf.cell(0, 10, "Our Solution - AI Travel Planner", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.set_font("Helvetica", "", 11)
pdf.set_text_color(50, 50, 50)
solution = (
    "Built with IBM Watsonx.ai (Meta Llama 3.3 70B / Mistral) and Python Flask. "
    "10 specialised AI agents run in parallel via ThreadPoolExecutor: Destination "
    "Recommender, Itinerary Planner, Budget Planner, Transport Advisor, Hotel "
    "Recommender, Weather Advisory, Local Guide, Restaurant Advisor, Packing "
    "Checklist, and Chat Assistant. Fully personalised based on user preferences, "
    "budget, and travel style. Includes PDF export, in-memory trip store, and "
    "off-topic chat guard. Accessible via browser at localhost:5000."
)
pdf.multi_cell(0, 7, solution)

pdf.output("Problem_Statement.pdf")
print("PDF created successfully.")
