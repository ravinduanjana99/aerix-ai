import asyncio
import base64
import json
from fastapi import WebSocket, WebSocketDisconnect
from google import genai
from google.genai import types

from core.config import settings
from services.rag_service import retrieve_relevant_chunks

AVAILABLE_LIVE_VOICES = [
    "Aoede",
    "Zephyr",
    "Puck",
    "Charon",
    "Kore",
    "Fenrir",
    "Leda",
    "Orus",
]


def _build_system_instruction(lang: str) -> str:
    is_sinhala = lang.lower().startswith("si")
    lang_rule = (
        "The user prefers Sri Lankan Sinhala (සිංහල). Speak in natural, warm, conversational Sri Lankan Sinhala cadence (never overly formal textbook Sinhala), while naturally pronouncing technical terms."
        if is_sinhala
        else "The user prefers English. Speak in articulate, warm, confident conversational English."
    )
    return (
        "You are AERIX (pronounced 'Air-ix'), a real-time synthetic AI co-pilot engineered by Ravindu Anjana, "
        "a Full-Stack and AI Systems Software Engineer.\n"
        f"{lang_rule}\n"
        "VOICE CONVERSATION RULES:\n"
        "- Speak naturally and concisely (2-4 sentences unless the user asks for deep detail).\n"
        "- NEVER read markdown symbols, asterisks, URLs, or code syntax aloud.\n"
        "- Never refer to Ravindu Anjana as your 'partner' or 'buddy' — he is your creator and lead software engineer.\n"
        "- If asked about Ravindu Anjana, AERIX's architecture, or technical capabilities, call the `search_knowledge_base` tool first."
    )


def _get_rag_tool() -> types.Tool:
    return types.Tool(
        function_declarations=[
            types.FunctionDeclaration(
                name="search_knowledge_base",
                description="Search AERIX's local vector knowledge base for facts about Ravindu Anjana, AERIX architecture, and features.",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "query": types.Schema(
                            type=types.Type.STRING,
                            description="The search query to look up in the knowledge base.",
                        )
                    },
                    required=["query"],
                ),
            )
        ]
    )


async def handle_live_websocket(
    websocket: WebSocket,
    lang: str = "en-US",
    voice: str = "Aoede",
) -> None:
    """Bidirectional WebSocket relay between browser PCM audio and Gemini Multimodal Live API."""
    await websocket.accept()

    if not settings.GEMINI_API_KEY:
        await websocket.send_json({"type": "error", "message": "GEMINI_API_KEY is not configured."})
        await websocket.close(code=1011)
        return

    chosen_voice = voice if voice in AVAILABLE_LIVE_VOICES else "Aoede"
    client = genai.Client(
        api_key=settings.GEMINI_API_KEY,
        http_options={"api_version": "v1alpha"},
    )

    config = types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=chosen_voice)
            )
        ),
        input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
        system_instruction=types.Content(
            parts=[types.Part.from_text(text=_build_system_instruction(lang))]
        ),
        tools=[_get_rag_tool()],
    )

    try:
        async with client.aio.live.connect(
            model=settings.GEMINI_LIVE_MODEL, config=config
        ) as session:
            await websocket.send_json({"type": "ready", "voice": chosen_voice, "lang": lang})

            async def forward_client_to_gemini():
                try:
                    while True:
                        raw = await websocket.receive_text()
                        msg = json.loads(raw)
                        msg_type = msg.get("type")

                        if msg_type == "audio" and msg.get("data"):
                            pcm_bytes = base64.b64decode(msg["data"])
                            await session.send_realtime_input(
                                audio=types.Blob(
                                    data=pcm_bytes,
                                    mime_type="audio/pcm;rate=16000",
                                )
                            )
                        elif msg_type == "text" and msg.get("text"):
                            await session.send_client_content(
                                turns=types.Content(
                                    role="user",
                                    parts=[types.Part.from_text(text=msg["text"])],
                                ),
                                turn_complete=True,
                            )
                except WebSocketDisconnect:
                    pass

            async def forward_gemini_to_client():
                try:
                    async for response in session.receive():
                        # Handle RAG tool calls mid-conversation
                        if response.tool_call and response.tool_call.function_calls:
                            fn_responses = []
                            for fc in response.tool_call.function_calls:
                                if fc.name == "search_knowledge_base":
                                    query = (fc.args or {}).get("query", "")
                                    chunks = retrieve_relevant_chunks(query, k=3)
                                    result_text = "\n\n".join(chunks) if chunks else "No matching records found."
                                    fn_responses.append(
                                        types.FunctionResponse(
                                            id=fc.id,
                                            name=fc.name,
                                            response={"result": result_text},
                                        )
                                    )
                            if fn_responses:
                                await session.send_tool_response(function_responses=fn_responses)
                            continue

                        sc = response.server_content
                        if not sc:
                            continue

                        if sc.interrupted:
                            await websocket.send_json({"type": "interrupted"})

                        if sc.input_transcription and sc.input_transcription.text:
                            await websocket.send_json({
                                "type": "input_transcript",
                                "text": sc.input_transcription.text,
                            })

                        if sc.output_transcription and sc.output_transcription.text:
                            await websocket.send_json({
                                "type": "output_transcript",
                                "text": sc.output_transcription.text,
                            })

                        if sc.model_turn and sc.model_turn.parts:
                            for part in sc.model_turn.parts:
                                if part.inline_data and part.inline_data.data:
                                    b64_audio = base64.b64encode(part.inline_data.data).decode("ascii")
                                    await websocket.send_json({
                                        "type": "audio",
                                        "data": b64_audio,
                                    })

                        if sc.turn_complete:
                            await websocket.send_json({"type": "turn_complete"})
                except WebSocketDisconnect:
                    pass

            client_task = asyncio.create_task(forward_client_to_gemini())
            gemini_task = asyncio.create_task(forward_gemini_to_gemini())

            done, pending = await asyncio.wait(
                [client_task, gemini_task],
                return_when=asyncio.FIRST_COMPLETED,
            )
            for task in pending:
                task.cancel()
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[Gemini Live Error] {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
