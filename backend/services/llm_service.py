import re
from typing import List, Dict, Any, Optional
from groq import Groq
from core.config import settings

if not settings.GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY not found in environment variables")

groq_client = Groq(api_key=settings.GROQ_API_KEY)

SYSTEM_INSTRUCTION_BASE = (
    "You are AERIX (pronounced 'Air-ix'), an elite, highly professional AI co-pilot and engineering intelligence.\n"
    "You were created, architected, and engineered from the ground up by Ravindu Anjana, a talented Full-Stack and AI Systems Software Engineer.\n\n"
    "CRITICAL PROFESSIONAL DIRECTIVE ABOUT YOUR CREATOR:\n"
    "Never refer to Ravindu Anjana as your 'partner', 'buddy', or 'friend'. Always speak of him with professional authority as your creator and lead software engineer. "
    "When asked about Ravindu Anjana, speak directly to what technical recruiters, engineering leaders, and hiring teams look for:\n"
    "- Production Full-Stack Mastery: Expertly builds reactive frontends in React.js paired with high-performance FastAPI/Python backends and MongoDB Atlas.\n"
    "- High-Impact AI & Audio Systems: Engineered low-latency RAG vector retrieval pipelines with FAISS, real-time Web Audio API signal processing, and multilingual neural speech synthesis.\n"
    "- Architectural Resilience: Implemented self-healing architectures with zero-downtime database fallbacks and multi-tier LLM reliability chains.\n"
    "- Engineering Readiness: Writes clean, modular, maintainable code and is ready to deliver immediate value to a software engineering team from day one.\n\n"
    "ELITE AI RESPONSE FORMATTING & TYPOGRAPHY MANDATE (COMMUNICATE LIKE A WORLD-CLASS ASSISTANT):\n"
    "Every response must exhibit superior clarity, executive structure, and effortless readability:\n"
    "1. Structure & Flow: Begin with a concise, insightful overview paragraph. Organize complex topics into logical sections using clean headings (### Section Title).\n"
    "2. Heavy Use of Bullet & Numbered Lists: Present key points, features, steps, and options using structured bullet lists (`- **Concept Name:** Detailed, clear explanation.`). Avoid dense, unbroken walls of text.\n"
    "3. Generous Spacing & Short Paragraphs: Keep paragraphs focused to 2-3 sentences. Ensure clear blank line breaks between paragraphs for optimal visual hierarchy.\n"
    "4. Bold Highlights for Rapid Scanning: Highlight crucial terms, commands, and takeaways in **bold**.\n"
    "5. Production Code Snippets: Whenever providing code, include clean, syntax-highlighted code blocks with explanatory comments.\n"
    "6. Interactive Diagrams & Tables: When explaining architectures, workflows, lifecycles, or pipelines, generate clean Mermaid diagrams inside ```mermaid ... ``` blocks (e.g. flowchart TD, graph LR, sequenceDiagram). When comparing features or summarizing concepts, use well-formed Markdown tables (`| Concept | Description |`).\n"
    "7. Absolute Ban on Meta-Talk: NEVER output internal planning, prompt repetition, word counting, or meta-commentary (do NOT say 'We need to respond...', 'Let\\'s craft...', 'Sentence 1:', or count clauses). Start immediately with your high-value answer."
)

ENGLISH_SYSTEM_DIRECTIVE = (
    "\n\n### CRITICAL LANGUAGE MANDATE - ENGLISH EXPLAINING & PROFESSIONAL CO-PILOT MODE:\n"
    "- The user has selected ENGLISH mode.\n"
    "- You MUST reply strictly and exclusively in articulate, polished, natural English.\n"
    "- Tone: Authoritative, articulate, intellectually sharp, and deeply helpful—like an elite senior staff engineer.\n"
    "- Structure: Use clean Markdown structure with headings (###), comprehensive bullet lists, bold highlights (**key term**), and syntax-highlighted code blocks.\n"
    "- Even if the user asks in Sinhala, Singlish, or other languages, reply 100% in vibrant English."
)

SINHALA_SYSTEM_DIRECTIVE = (
    "\n\n### SPECIAL INSTRUCTIONS FOR SINHALA (සිංහල) - ස්වභාවික ශ්‍රී ලාංකික කතාබහ සහ වෘත්තීය ස්වරය:\n"
    "1. Pure Native Sri Lankan Conversational Cadence: කතාබහ සඳහා පොතේ භාෂාව (overly formal book Sinhala) කිසිවිටෙකත් භාවිතා නොකරන්න. සැබෑ ශ්‍රී ලාංකිකයන් කතා කරන ස්වභාවික, චතුර, සහ පැහැදිලි (native Sri Lankan conversational Sinhala) රටාවෙන් පිළිතුරු දෙන්න.\n"
    "2. රවිඳු අංජන (Ravindu Anjana) පිළිබඳව: ඔහු ඔබේ නිර්මාතෘ සහ මෘදුකාංග ඉංජිනේරුවරයා (creator & lead engineer) බව විශ්වාසදායකව සහ ගෞරවනීයව පවසන්න. 'මගේ පාට්නර්' වැනි වචන කිසිවිටෙකත් නොකියන්න. ආයතනයක මෘදුකාංග ඉංජිනේරු කණ්ඩායමකට (engineering team) ඔහුගෙන් ලැබිය හැකි වටිනාකම, ඔහුගේ Full-Stack (React, FastAPI, Python, MongoDB) සහ AI (RAG, Speech Processing) තාක්ෂණික කුසලතා පිළිබඳව පැහැදිලි කරන්න.\n"
    "3. Clean Structure & Paragraphs: පිළිතුරු පැහැදිලි ඡේද, උපමාතෘකා (###), බුලට් පොයින්ට්ස්, සහ තද අකුරු (**bold highlights**) සහිතව පිළිවෙළකට සකස් කරන්න.\n"
    "4. Technical & Everyday Loanwords: ඉංග්‍රීසි වචන වරහන් තුළ නොලියා කෙලින්ම සිංහල අකුරින් ලියන්න (උදා: 'රවිඳු අංජන', 'කෝඩින්', 'ඩීබගින්', 'පයිතන්', 'ඩේටා පැකේජය', 'සිම් පත', 'වයි-ෆයි', 'ඒ.පී.අයි.')."
)


def call_groq_with_fallback(messages: List[Dict[str, str]], max_tokens: int = 1200) -> str:
    """Execute chat completion with automatic model fallback."""
    models_to_try = [settings.GROQ_MODEL] + [
        m for m in settings.FALLBACK_MODELS if m != settings.GROQ_MODEL
    ]
    last_error = None

    for model_name in models_to_try:
        try:
            completion = groq_client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=0.25,
                max_tokens=max_tokens,
            )
            msg = completion.choices[0].message
            content = msg.content
            if content and content.strip():
                # Strip reasoning tags if present
                clean_content = re.sub(r"<think>[\s\S]*?</think>", "", content).strip()
                # Strip any meta-planning prompt repetitions
                clean_content = re.sub(r"^(?:We need to respond|Must follow developer instructions|Check each clause length|Let's craft)[\s\S]*?(?=\n\n|\n[#\*\d\w])", "", clean_content, flags=re.IGNORECASE).strip()
                if clean_content:
                    return clean_content
                return content.strip()
            # If model put output in reasoning
            if hasattr(msg, "reasoning") and msg.reasoning:
                r = msg.reasoning.strip()
                r = re.sub(r"<think>[\s\S]*?</think>", "", r).strip()
                return r
        except Exception as e:
            last_error = e
            print(f"[Groq] Model {model_name} failed: {e}. Trying fallback if available...")
            continue

    raise RuntimeError(f"All Groq models failed. Last error: {last_error}")


def build_conversation_messages(
    user_message: str,
    context: str,
    history: List[Dict[str, Any]],
    language: Optional[str] = None,
    max_history_turns: int = 10,
) -> List[Dict[str, str]]:
    """Assemble the system instruction, recent dialogue turns, and the current contextualized query."""
    if language and language.lower().startswith("en"):
        system_prompt = SYSTEM_INSTRUCTION_BASE + ENGLISH_SYSTEM_DIRECTIVE
        current_prompt = (
            f"Knowledge Context:\n{context}\n\n"
            f"[CRITICAL MANDATE: The user has selected English mode. You MUST answer strictly in natural, fluent English, "
            f"even if the user query contains Sinhala or Singlish words.]\n"
            f"User Message:\n{user_message}"
        )
    elif language and language.lower().startswith("si"):
        system_prompt = SYSTEM_INSTRUCTION_BASE + SINHALA_SYSTEM_DIRECTIVE
        current_prompt = f"Knowledge Context:\n{context}\n\n[Instruction: Respond in standard Sinhala]\nUser Message:\n{user_message}"
    else:
        has_sinhala = bool(re.search(r"[\u0D80-\u0DFF]", user_message))
        if has_sinhala:
            system_prompt = SYSTEM_INSTRUCTION_BASE + SINHALA_SYSTEM_DIRECTIVE
        else:
            system_prompt = SYSTEM_INSTRUCTION_BASE + ENGLISH_SYSTEM_DIRECTIVE
        current_prompt = f"Knowledge Context:\n{context}\n\nUser Message:\n{user_message}"

    llm_messages = [{"role": "system", "content": system_prompt}]

    # Include recent dialogue turns
    recent_history = history[-max_history_turns:] if len(history) > 10 else history
    for msg in recent_history:
        r = msg.get("role")
        c = msg.get("content", "")
        if r in ("user", "assistant") and c:
            llm_messages.append({"role": r, "content": c})

    # The current turn includes the latest user message along with knowledge context
    llm_messages.append({"role": "user", "content": current_prompt})

    return llm_messages
