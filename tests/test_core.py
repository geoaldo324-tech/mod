from functools import partial
from http.client import HTTPConnection
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Thread
from unittest import TestCase

from core import OllamaRuntime
from mosaico import StudioHandler


class FakeOllama(BaseHTTPRequestHandler):
    calls = []

    def log_message(self, *args):
        pass

    def reply(self, value):
        payload = json.dumps(value).encode()
        self.send_response(200)
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        if self.path == "/api/tags":
            self.reply({"models": [{"name": "cerebro-a"}, {"name": "cerebro-b"}]})

    def do_POST(self):
        length = int(self.headers["Content-Length"])
        payload = json.loads(self.rfile.read(length))
        self.calls.append(payload)
        self.reply({"message": {"role": "assistant", "content": "Hola desde " + payload["model"]}})


class CoreIntegrationTest(TestCase):
    def setUp(self):
        FakeOllama.calls = []
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.provider = ThreadingHTTPServer(("127.0.0.1", 0), FakeOllama)
        Thread(target=self.provider.serve_forever, daemon=True).start()
        self.addCleanup(self.provider.server_close)
        self.addCleanup(self.provider.shutdown)
        handler = partial(StudioHandler, directory=self.tmp.name, data_dir=Path(self.tmp.name),
                          runtime=OllamaRuntime(self.provider.server_port))
        self.app = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        Thread(target=self.app.serve_forever, daemon=True).start()
        self.addCleanup(self.app.server_close)
        self.addCleanup(self.app.shutdown)

    def request(self, method, path, body=None, headers=None):
        connection = HTTPConnection("127.0.0.1", self.app.server_port, timeout=5)
        try:
            connection.request(method, path, body, headers or {})
            response = connection.getresponse()
            return response.status, response.read()
        finally:
            connection.close()

    def test_switch_models_keeps_same_profile_and_conversation(self):
        status, data = self.request("GET", "/api/core/models")
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(data)["models"], ["cerebro-a", "cerebro-b"])
        headers = {"Content-Type": "application/json", "X-Mosaico-Client": "studio"}
        system = {"role": "system", "content": "Personalidad: amable. Recuerdo: vive en Lima."}
        history = [system, {"role": "user", "content": "¿Dónde vivo?"}]
        for model in ("cerebro-a", "cerebro-b"):
            body = json.dumps({"model": model, "messages": history}).encode()
            status, data = self.request("POST", "/api/core/chat", body, headers)
            self.assertEqual(status, 200)
            self.assertEqual(json.loads(data)["reply"], "Hola desde " + model)
            history.extend([{"role": "assistant", "content": json.loads(data)["reply"]},
                            {"role": "user", "content": "¿Y ahora?"}])
        self.assertEqual(FakeOllama.calls[1]["messages"][0], system)
        self.assertEqual(FakeOllama.calls[1]["messages"][1]["content"], "¿Dónde vivo?")
        self.assertFalse(FakeOllama.calls[1]["stream"])

    def test_rejects_invalid_requests_without_calling_model(self):
        body = json.dumps({"model": "cerebro-a", "messages": [{"role": "tool", "content": "x"}]}).encode()
        headers = {"Content-Type": "application/json", "X-Mosaico-Client": "studio"}
        self.assertEqual(self.request("POST", "/api/core/chat", body, headers)[0], 400)
        self.assertEqual(self.request("POST", "/api/core/chat", body)[0], 403)
        self.assertEqual(FakeOllama.calls, [])
