from functools import partial
from http.client import HTTPConnection
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Thread
from unittest import TestCase

from http.server import ThreadingHTTPServer
from mosaico import StudioHandler


class PersistenceTest(TestCase):
    def setUp(self):
        self.directory = TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        handler = partial(StudioHandler, directory=self.directory.name,
                          data_dir=Path(self.directory.name))
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        self.addCleanup(self.server.server_close)
        Thread(target=self.server.serve_forever, daemon=True).start()
        self.addCleanup(self.server.shutdown)

    def request(self, method, body=None, headers=None):
        connection = HTTPConnection("127.0.0.1", self.server.server_port, timeout=3)
        try:
            connection.request(method, "/api/project", body=body, headers=headers or {})
            response = connection.getresponse()
            return response.status, response.read()
        finally:
            connection.close()

    def test_saved_project_survives_bad_writes(self):
        self.assertEqual(self.request("GET"), (200, b"null"))
        headers = {"Content-Type": "application/json", "X-Mosaico-Client": "studio"}
        project = {"version": 1, "name": "Prueba", "notes": "Qué aprendió Lola"}
        data = json.dumps(project, ensure_ascii=False).encode()
        self.assertEqual(self.request("PUT", data, headers)[0], 200)
        self.assertEqual(self.request("PUT", b'{"version":true}', headers)[0], 400)
        self.assertEqual(self.request("PUT", b'{"version":2}', headers)[0], 400)
        self.assertEqual(self.request("PUT", data)[0], 403)
        self.assertEqual(self.request("GET", headers={"Host": "example.invalid"})[0], 403)
        self.assertEqual(json.loads(self.request("GET")[1]), project)
        self.assertEqual((Path(self.directory.name) / "proyecto.mosaico").read_bytes(), data)
