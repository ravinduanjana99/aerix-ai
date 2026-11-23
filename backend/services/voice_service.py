import io
import re
from typing import Optional

try:
    import edge_tts
except ImportError:
    edge_tts = None

try:
    from gtts import gTTS
except ImportError:
    gTTS = None

# Available State-of-the-Art Neural Voices
VOICES = {
    "si": {
        "female": "si-LK-ThiliniNeural",
        "male": "si-LK-SameeraNeural",
    },
    "en": {
        "female": "en-US-AriaNeural",      # Microsoft's flagship conversational expressive voice
        "male": "en-US-GuyNeural",         # Friendly conversational male voice
        "warm": "en-US-JennyNeural",       # Warm natural female voice
    }
}

# ==================================================
# SINHALA PHONETIC LOANWORD & ACRONYM DICTIONARY
# Converts English technical loanwords and acronyms
# into authentic Sri Lankan phonetic pronunciation
# ==================================================
PHONETIC_LOANWORDS = {
    # Brand / System (Pronounced 'Air-ix' -> ඇයිරික්ස්)
    "aerix": "ඇයිරික්ස්",

    # Creator & Engineer (Pronounced natively in Sri Lankan Sinhala with distinct articulation)
    "ravindu anjana": "රවිඳු, අන්ජන",
    "ravindu": "රවිඳු,",
    "anjana": "අන්ජන",
    "engineer": "ඉංජිනේරු",
    "engineers": "ඉංජිනේරුවන්",
    "engineering": "ඉංජිනේරු",
    "fastapi": "ෆාස්ට් ඒ.පී.අයි.",
    "mongodb": "මොන්ගෝ ඩී.බී.",
    "faiss": "ෆෙයිස්",
    "pytorch": "පයිටෝච්",
    "rag": "ආර්.ඒ.ජී.",
    "recruiter": "රිකෲටර්",
    "recruiters": "රිකෲටර්ස්",

    # Common Acronyms
    "api": "ඒ.පී.අයි.",
    "apis": "ඒ.පී.අයි.ස්",
    "ai": "ඒ.අයි.",
    "ui": "යූ.අයි.",
    "ux": "යූ.එක්ස්.",
    "url": "යූ.ආර්.එල්.",
    "urls": "යූ.ආර්.එල්.ස්",
    "pdf": "පී.ඩී.එෆ්.",
    "sim": "සිම්",
    "id": "අයි.ඩී.",
    "html": "එච්.ටී.එම්.එල්.",
    "css": "සී.එස්.එස්.",
    "js": "ජේ.එස්.",
    "sql": "එස්.කිව්.එල්.",
    "os": "ඕ.එස්.",
    "ram": "රැම්",
    "cpu": "සී.පී.යූ.",
    "pc": "පී.සී.",
    "faq": "එෆ්.ඒ.කිව්.",
    "sms": "එස්.එම්.එස්.",
    "gb": "ජී.බී.",
    "mb": "එම්.බී.",
    "kb": "කේ.බී.",
    "mbps": "එම්.බී.පී.එස්.",
    "kbps": "කේ.බී.පී.එස්.",
    "lkr": "රුපියල්",

    # Programming & Tech
    "coding": "කෝඩින්",
    "code": "කෝඩ්",
    "codes": "කෝඩ්ස්",
    "debugging": "ඩීබගින්",
    "debug": "ඩීබග්",
    "bug": "බග්",
    "bugs": "බග්ස්",
    "error": "එරර්",
    "errors": "එරර්ස්",
    "developer": "ඩිවෙලොපර්",
    "developers": "ඩිවෙලොපර්ස්",
    "development": "ඩිවෙලොප්මන්ට්",
    "programming": "ප්‍රෝග්‍රැමින්",
    "program": "ප්‍රෝග්‍රෑම්",
    "programs": "ප්‍රෝග්‍රෑම්ස්",
    "software": "සොෆ්ට්වෙයාර්",
    "hardware": "හාඩ්වෙයාර්",
    "python": "පයිතන්",
    "javascript": "ජාවාස්ක්‍රිප්ට්",
    "java": "ජාවා",
    "react": "රියැක්ට්",
    "angular": "ඇන්ගියුලර්",
    "node": "නෝඩ්",
    "nodejs": "නෝඩ් ජේ.එස්.",
    "git": "ගිට්",
    "github": "ගිට්හබ්",
    "frontend": "ෆ්‍රන්ට් එන්ඩ්",
    "backend": "බැක් එන්ඩ්",
    "fullstack": "ෆුල් ස්ටැක්",
    "database": "ඩේටා බේස්",
    "databases": "ඩේටා බේසස්",
    "server": "සර්වර්",
    "servers": "සර්වර්ස්",
    "cloud": "ක්ලවුඩ්",

    # Computing & Devices
    "computer": "කොම්පියුටර්",
    "computers": "කොම්පියුටර්ස්",
    "laptop": "ලැප්ටොප්",
    "laptops": "ලැප්ටොප්ස්",
    "mobile": "මොබයිල්",
    "phone": "ෆෝන්",
    "phones": "ෆෝන්ස්",
    "android": "ඇන්ඩ්‍රොයිඩ්",
    "ios": "අයි.ඕ.එස්.",
    "windows": "වින්ඩෝස්",
    "linux": "ලිනක්ස්",
    "internet": "ඉන්ටර්නෙට්",
    "wifi": "වයි-ෆයි",
    "wi-fi": "වයි-ෆයි",
    "network": "නෙට්වර්ක්",
    "router": "රවුටරය",
    "routers": "රවුටර්ස්",
    "broadband": "බ්‍රෝඩ්බෑන්ඩ්",
    "package": "පැකේජ්",
    "packages": "පැකේජස්",
    "data": "ඩේටා",
    "speed": "ස්පීඩ්",

    # General Web & Actions
    "app": "ඇප්",
    "apps": "ඇප්ස්",
    "application": "ඇප්ලිකේෂන්",
    "applications": "ඇප්ලිකේෂන්ස්",
    "web": "වෙබ්",
    "website": "වෙබ්සයිට්",
    "websites": "වෙබ්සයිට්ස්",
    "online": "ඔන්ලයින්",
    "offline": "ඕෆ්ලයින්",
    "chat": "චැට්",
    "message": "මැසේජ්",
    "messages": "මැසේජස්",
    "email": "ඊමේල්",
    "gmail": "ජීමේල්",
    "account": "එකවුන්ට්",
    "login": "ලොගින්",
    "logout": "ලොග් අවුට්",
    "password": "පාස්වර්ඩ්",
    "file": "ෆයිල්",
    "files": "ෆයිල්ස්",
    "folder": "ෆෝල්ඩර්",
    "download": "ඩවුන්ලෝඩ්",
    "upload": "අප්ලෝඩ්",
    "install": "ඉන්ස්ටෝල්",
    "update": "අප්ඩේට්",
    "link": "ලින්ක්",
    "links": "ලින්ක්ස්",
    "search": "සර්ච්",
    "test": "ටෙස්ට්",
    "testing": "ටෙස්ටින්",
    "voice": "වොයිස්",
    "assistant": "ඇසිස්ටන්ට්",
    "project": "ප්‍රොජෙක්ට්",
    "system": "සිස්ටම්",
    "model": "මොඩල්",
}


def transliterate_english_loanwords(text: str) -> str:
    """
    Substitutes English loanwords and acronyms with natural Sinhala phonetic equivalents
    so that Sinhala acoustic models pronounce them with native Sri Lankan cadence.
    """
    for eng, sin in PHONETIC_LOANWORDS.items():
        pattern = rf"\b{re.escape(eng)}\b"
        text = re.sub(pattern, sin, text, flags=re.IGNORECASE)
    return text


# ==================================================
# NATURAL DISCOURSE MARKERS & BREATHING PARTICLES
# Injects authentic human breathing pauses into continuous text
# ==================================================
SINHALA_DISCOURSE_MARKERS = [
    "එමෙන්ම", "ඒ නිසා", "නමුත්", "එසේම", "විශේෂයෙන්ම", "උදාහරණයක් ලෙස",
    "ඇත්තටම", "මෙහිදී", "ඒ වගේම", "කෙසේ වෙතත්", "පළමුවෙන්ම", "දෙවනුව",
    "අවසාන වශයෙන්", "මතක තබා ගන්න", "නිසැකවම", "සරලවම කිව්වොත්", "නියමයි"
]

ENGLISH_DISCOURSE_MARKERS = [
    "However", "Therefore", "In addition", "Furthermore", "For example",
    "Actually", "Specifically", "Remember", "First of all", "Simply put",
    "Additionally", "Keep in mind", "Most importantly", "As a result"
]

SINHALA_PARTICLES = {"සඳහා", "මගින්", "වෙත", "ගැන", "අතර", "තුළ", "කර", "වී", "බව", "ලෙස", "විට", "පසු"}
ENGLISH_PARTICLES = {"that", "which", "because", "while", "when", "since", "where", "with", "about", "through"}


def inject_natural_breathing_pauses(text: str, is_sinhala: bool = True) -> str:
    """
    Injects natural breathing pauses (commas) at discourse markers and splits
    long run-on clauses into rhythmic, human-like conversational thought units.
    """
    if is_sinhala:
        for marker in SINHALA_DISCOURSE_MARKERS:
            pattern = rf"(\b{marker}\b)(?!\s*[,.!?։])"
            text = re.sub(pattern, r"\1,", text)
        text = re.sub(r"(\s+)(සහ|හෝ|මෙන්ම)(\s+)", r", \2\3", text)
    else:
        for marker in ENGLISH_DISCOURSE_MARKERS:
            pattern = rf"(\b{marker}\b)(?!\s*[,.!?])"
            text = re.sub(pattern, r"\1,", text, flags=re.IGNORECASE)
        text = re.sub(r"(\s+)(and also|which means|because of this|so that)(\s+)", r", \2\3", text, flags=re.IGNORECASE)

    # Clean double commas and spaces
    text = re.sub(r"\s*,\s*", ", ", text)
    text = re.sub(r",(\s*,)+", ",", text)

    # Split long run-on sentences (> 8 words) at natural syntactic boundaries
    sentences = re.split(r"([.!?։]+)", text)
    processed_sentences = []
    particles = SINHALA_PARTICLES if is_sinhala else ENGLISH_PARTICLES

    for i in range(0, len(sentences), 2):
        sentence = sentences[i].strip()
        sep = sentences[i + 1] if i + 1 < len(sentences) else ""
        if not sentence:
            continue

        clauses = sentence.split(",")
        processed_clauses = []
        for clause in clauses:
            words = clause.strip().split()
            if len(words) > 8:
                mid = len(words) // 2
                best_split = None
                for offset in range(0, max(mid - 2, 1)):
                    for idx in [mid + offset, mid - offset]:
                        if 3 <= idx < len(words) - 2 and words[idx] in particles:
                            best_split = idx + 1
                            break
                    if best_split:
                        break
                if not best_split:
                    best_split = mid
                chunk1 = " ".join(words[:best_split])
                chunk2 = " ".join(words[best_split:])
                processed_clauses.append(f"{chunk1}, {chunk2}")
            else:
                processed_clauses.append(" ".join(words))

        processed_sentences.append(", ".join(processed_clauses) + sep)

    result = " ".join(processed_sentences)
    result = re.sub(r"\s*,\s*", ", ", result)
    result = re.sub(r",(\s*,)+", ",", result)
    result = re.sub(r",\s*\.", ". ", result)
    result = re.sub(r"\s+", " ", result).strip()
    return result


def prepare_text_for_speech(text: str, is_sinhala: bool = True) -> str:
    """
    Refines text specifically for speech synthesis:
    - Transliterates English loanwords into authentic Sinhala phonetics when in Sinhala mode.
    - Injects commas at discourse markers and long run-on clauses for natural human breathing pauses.
    - Ensures every sentence, list item, or paragraph ends with a full stop for breath pauses.
    - Strips code fences, raw markdown syntax, and URLs.
    """
    if not text:
        return ""

    # 1. Strip URLs and email addresses
    t = re.sub(r"https?://\S+", "", text)
    t = re.sub(r"\S+@\S+", "", t)

    # 2. Handle code blocks and markdown headers
    code_sub = "කේත කොටසකි." if is_sinhala else "code block."
    t = re.sub(r"```[\s\S]*?```", code_sub, t)
    t = re.sub(r"#+\s*", "", t)

    # 3. Strip bold/italics and turn bold section titles into natural pauses
    t = re.sub(r"\*\*([^*]+)\*\*", r"\1, ", t)
    t = re.sub(r"\*([^*]+)\*", r"\1, ", t)

    # 4. Clean numbered list markers (1. , 2. ) and bullet points at line starts
    t = re.sub(r"^\s*(\d+[\.\)]|\-|\*|•)\s*", "", t, flags=re.MULTILINE)

    # 5. Clean brackets and format colons to comma pauses
    t = re.sub(r"[\(\)\[\]\{\}]", " ", t)
    t = re.sub(r":\s*", ", ", t)

    # 6. Ensure every line or bullet point ends with a full stop for a natural breath pause
    lines = [line.strip() for line in t.split("\n") if line.strip()]
    punctuated_lines = []
    for line in lines:
        if not re.search(r"[.!?։,]$", line):
            line += "."
        punctuated_lines.append(line)
    t = " ".join(punctuated_lines)

    # 7. Inject natural breathing pauses at discourse markers and long run-on clauses
    t = inject_natural_breathing_pauses(t, is_sinhala=is_sinhala)

    # 8. Clean duplicate punctuation and whitespace
    t = re.sub(r"\s*,\s*", ", ", t)
    t = re.sub(r"\s*\.\s*", ". ", t)
    t = re.sub(r",(\s*,)+", ",", t)
    t = re.sub(r"\.(\s*\.)+", ".", t)
    t = re.sub(r",\s*\.", ". ", t)
    t = re.sub(r"\s+", " ", t).strip()

    # 9. Brand & Identity Pronunciation Normalization (AERIX -> Airix in English / ඇයිරික්ස් in Sinhala)
    if is_sinhala:
        t = re.sub(r"\b(aerix|a-e-r-i-x|ඒරික්ස්)\b", "ඇයිරික්ස්", t, flags=re.IGNORECASE)
        t = transliterate_english_loanwords(t)
        # Crystal-clear native Sri Lankan pronunciation for creator's name:
        # Micro-pause and dental nasal 'න්' prevent vowel hiatus slurring and ensure crisp articulation of "රවිඳු, අන්ජන"
        t = re.sub(r"(?:රවිඳු|රවිදු)\s*(?:අංජන|අන්ජන)", "රවිඳු, අන්ජන", t)
        t = re.sub(r"(?<![^\s])(?:රවිඳු|රවිදු)(?!\s*[,.!?])", "රවිඳු,", t)
        t = re.sub(r"(?<![^\s])අංජන(?![^\s])", "අන්ජන", t)
    else:
        # In English, prevent TTS from spelling out all-caps 'A-E-R-I-X'
        t = re.sub(r"\b(aerix|a-e-r-i-x)\b", "Airix", t, flags=re.IGNORECASE)
        # Crystal-clear articulation of creator's name in English:
        # "Rah-vindu, Anjana" gives the authentic open 'Rah' vowel and breathing space between first and last name
        t = re.sub(r"\bravindu\s+anjana\b", "Rah-vindu, Anjana", t, flags=re.IGNORECASE)
        t = re.sub(r"\bravindu\b", "Rah-vindu", t, flags=re.IGNORECASE)
        # If Sinhala script was included in English mode, transliterate phonetically for Aria
        t = re.sub(r"(?:රවිඳු|රවිදු)\s*(?:අංජන|අන්ජන)", "Rah-vindu, Anjana", t)
        t = re.sub(r"(?<![^\s])(?:රවිඳු|රවිදු)", "Rah-vindu", t)
        t = re.sub(r"(?<![^\s])(?:අංජන|අන්ජන)", "Anjana", t)

    # 10. Final punctuation & comma cleanup
    t = re.sub(r"\s*,\s*", ", ", t)
    t = re.sub(r",(\s*,)+", ",", t)
    t = re.sub(r",\s*\.", ". ", t)
    t = re.sub(r"\s+", " ", t).strip()

    return t


async def synthesize_speech(
    text: str,
    lang: str = "si",
    gender: str = "female",
    speed: Optional[str] = None
) -> bytes:
    """
    Synthesizes speech using Microsoft Neural Voices with enthusiastic, explaining intonation,
    human breathing pauses, and authentic cadence for both Sinhala and English.
    """
    # Strict language determination:
    # If lang is explicitly requested as English ('en', 'en-US', etc.) -> English voice model.
    # If lang is explicitly requested as Sinhala ('si', 'si-LK') -> Sinhala voice model.
    # Otherwise auto-detect based on Sinhala Unicode script.
    if lang and lang.lower().startswith("en"):
        is_sinhala = False
        lang_key = "en"
    elif lang and lang.lower().startswith("si"):
        is_sinhala = True
        lang_key = "si"
    else:
        has_sinhala = bool(re.search(r"[\u0D80-\u0DFF]", text))
        is_sinhala = has_sinhala
        lang_key = "si" if has_sinhala else "en"

    cleaned_text = prepare_text_for_speech(text, is_sinhala=is_sinhala)
    if not cleaned_text:
        cleaned_text = text[:100]

    # Limit maximum characters for conversational responsiveness
    spoken_chunk = cleaned_text[:750]

    gender_key = "male" if gender.lower() == "male" else ("warm" if gender.lower() == "warm" else "female")

    voice = VOICES[lang_key].get(gender_key, VOICES[lang_key]["female"])

    # Natural Native Tone & Pitch Calibration:
    # +0Hz for Sinhala keeps the authentic, warm Sri Lankan natural vocal resonance
    # +1Hz for English gives Aria an engaging, articulate explanatory tone
    pitch = "+0Hz" if is_sinhala else "+1Hz"

    # Calibrated tempo: natural, articulate native cadence (-6% for Sinhala, +0% for English)
    if not speed:
        rate = "-6%" if is_sinhala else "+0%"
    else:
        rate = speed

    # 1. Primary: Microsoft Neural Voice Engine
    if edge_tts is not None:
        try:
            comm = edge_tts.Communicate(spoken_chunk, voice, rate=rate, pitch=pitch)
            audio_data = bytearray()
            async for chunk in comm.stream():
                if chunk["type"] == "audio":
                    audio_data.extend(chunk["data"])

            if audio_data:
                return bytes(audio_data)
        except Exception as err:
            print(f"[Neural Voice Service] edge-tts error, falling back to gTTS: {err}")

    # 2. Fallback: gTTS
    if gTTS:
        try:
            tts = gTTS(text=spoken_chunk, lang="si" if is_sinhala else "en", slow=False)
            buffer = io.BytesIO()
            tts.write_to_fp(buffer)
            buffer.seek(0)
            return buffer.getvalue()
        except Exception as e:
            print(f"[Voice Service] gTTS fallback failed: {e}")

    return b""
