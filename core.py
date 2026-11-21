"""Small local model adapter for the Universal AI Engine."""

import http.client
import json

MAX_RESPONSE_BYTES = 1024 * 1024


class RuntimeUnavailable(Exception):
    pass


class OllamaRuntime:
    """Connect only to the local Ollama service; no remote URLs or credentials."""

    def __init__(self, port=11434):
        self.port = port

    def _request(self, method, path, body=None):
        connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=120)
        try:
            headers = {"Content-Type": "application/json"} if body is not None else {}
            connection.request(method, path, body=body, headers=headers)
            response = connection.getresponse()
            data = response.read(MAX_RESPONSE_BYTES + 1)
            if response.status != 200 or len(data) > MAX_RESPONSE_BYTES:
                raise RuntimeUnavailable("Ollama no pudo completar la solicitud.")
            parsed = json.loads(data)
            if not isinstance(parsed, dict):
                raise ValueError("Invalid response")
            return parsed
        except (OSError, ValueError, UnicodeError, http.client.HTTPException) as exc:
            raise RuntimeUnavailable("No se pudo conectar a Ollama en este equipo.") from exc
        finally:
            connection.close()

    def models(self):
        result = self._request("GET", "/api/tags").get("models")
        if not isinstance(result, list):
            raise RuntimeUnavailable("Ollama devolvió una lista de modelos inválida.")
        return [item["name"] for item in result[:100] if isinstance(item, dict)
                and isinstance(item.get("name"), str) and 0 < len(item["name"]) <= 120]

    def chat(self, model, messages):
        body = json.dumps({"model": model, "messages": messages, "stream": False},
                          ensure_ascii=False).encode("utf-8")
        result = self._request("POST", "/api/chat", body)
        message = result.get("message")
        if not isinstance(message, dict) or not isinstance(message.get("content"), str):
            raise RuntimeUnavailable("El modelo no devolvió una respuesta de texto.")
        answer = message["content"].strip()
        if not answer:
            raise RuntimeUnavailable("El modelo devolvió una respuesta vacía.")
        return answer[:2000]


def valid_chat(value):
    if not isinstance(value, dict) or not isinstance(value.get("model"), str):
        return False
    if not value["model"].strip() or len(value["model"]) > 120:
        return False
    messages = value.get("messages")
    if not isinstance(messages, list) or not 1 <= len(messages) <= 22:
        return False
    return all(isinstance(item, dict)
               and item.get("role") in ("system", "user", "assistant")
               and isinstance(item.get("content"), str)
               and 0 < len(item["content"]) <= 8000 for item in messages)
