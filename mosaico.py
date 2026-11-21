"""Local desktop host and project storage for Mosaico Studio."""

from argparse import ArgumentParser
from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
from threading import Thread, Timer
from urllib.parse import urlsplit
import webbrowser

from core import OllamaRuntime, RuntimeUnavailable, valid_chat

BUNDLE = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
MAX_PROJECT_BYTES = 17 * 1024 * 1024


def data_home():
    windows_home = os.environ.get("LOCALAPPDATA")
    if sys.platform == "win32" and windows_home:
        return Path(windows_home) / "Mosaico Studio"
    return Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share")) / "mosaico-studio"


class StudioHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, directory, data_dir, local_only=True, runtime=None, **kwargs):
        self.runtime = runtime or OllamaRuntime()
        self.local_only = local_only
        self.project_path = data_dir / "proyecto.mosaico"
        super().__init__(*args, directory=directory, **kwargs)

    def log_message(self, message, *args):
        if sys.stderr is not None:
            super().log_message(message, *args)

    def valid_host(self):
        if not self.local_only:
            return True
        if self.headers.get("Host", "").split(":", 1)[0].lower() in {"localhost", "127.0.0.1"}:
            return True
        self.send_error(HTTPStatus.FORBIDDEN)
        return False

    def do_HEAD(self):
        if self.valid_host():
            super().do_HEAD()

    def api_response(self, status, data):
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if not self.valid_host():
            return
        path = urlsplit(self.path).path
        if path == "/api/health":
            self.api_response(HTTPStatus.OK, b'{"ok":true}')
        elif path == "/api/core/models":
            try:
                self.api_response(HTTPStatus.OK, json.dumps({"models": self.runtime.models()}).encode())
            except RuntimeUnavailable as exc:
                self.api_response(HTTPStatus.SERVICE_UNAVAILABLE, json.dumps({"error": str(exc)}).encode())
        elif path == "/api/project":
            try:
                if self.project_path.stat().st_size > MAX_PROJECT_BYTES:
                    raise ValueError("Project exceeds the size limit")
                data = self.project_path.read_bytes()
                self.api_response(HTTPStatus.OK, data)
            except FileNotFoundError:
                self.api_response(HTTPStatus.OK, b"null")
            except (OSError, ValueError):
                self.api_response(HTTPStatus.INTERNAL_SERVER_ERROR, b'{"error":"No se pudo abrir el proyecto."}')
        else:
            super().do_GET()

    def list_directory(self, path):
        self.send_error(HTTPStatus.NOT_FOUND)
        return None

    def do_POST(self):
        if not self.valid_host():
            return
        if urlsplit(self.path).path != "/api/core/chat":
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        if self.headers.get("X-Mosaico-Client") != "studio" or self.headers.get_content_type() != "application/json":
            self.send_error(HTTPStatus.FORBIDDEN)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 256 * 1024:
                self.send_error(HTTPStatus.REQUEST_ENTITY_TOO_LARGE)
                return
            data = self.rfile.read(length)
            value = json.loads(data)
            if len(data) != length or not valid_chat(value):
                self.send_error(HTTPStatus.BAD_REQUEST)
                return
        except (ValueError, RecursionError):
            self.send_error(HTTPStatus.BAD_REQUEST)
            return
        try:
            answer = self.runtime.chat(value["model"], value["messages"])
            self.api_response(HTTPStatus.OK, json.dumps({"reply": answer}).encode())
        except RuntimeUnavailable as exc:
            self.api_response(HTTPStatus.SERVICE_UNAVAILABLE, json.dumps({"error": str(exc)}).encode())

    def do_PUT(self):
        if not self.valid_host():
            return
        if urlsplit(self.path).path != "/api/project":
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        if self.headers.get("X-Mosaico-Client") != "studio" or self.headers.get_content_type() != "application/json":
            self.send_error(HTTPStatus.FORBIDDEN)
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if not 0 < length <= MAX_PROJECT_BYTES:
            self.send_error(HTTPStatus.REQUEST_ENTITY_TOO_LARGE)
            return

        try:
            data = self.rfile.read(length)
            project = json.loads(data)
            if (len(data) != length or not isinstance(project, dict)
                    or type(project.get("version")) is not int or project["version"] != 1):
                self.send_error(HTTPStatus.BAD_REQUEST)
                return
        except (ValueError, RecursionError):
            self.send_error(HTTPStatus.BAD_REQUEST)
            return

        staging_path = None
        try:
            self.project_path.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(dir=self.project_path.parent, delete=False) as staging:
                staging_path = Path(staging.name)
                staging.write(data)
            staging_path.replace(self.project_path)
        except OSError:
            self.api_response(HTTPStatus.INTERNAL_SERVER_ERROR, b'{"error":"No se pudo guardar el proyecto."}')
            return
        finally:
            if staging_path is not None:
                staging_path.unlink(missing_ok=True)
        self.api_response(HTTPStatus.OK, b'{"ok":true}')


def desktop(server, url):
    import webview

    webview.settings["ALLOW_DOWNLOADS"] = True
    Thread(target=server.serve_forever, daemon=True).start()
    try:
        webview.create_window("Mosaico Studio", url, width=1400, height=860, min_size=(820, 550))
        webview.start(gui="edgechromium")
    finally:
        server.shutdown()


def main():
    frozen = getattr(sys, "frozen", False)
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=0 if frozen else 4173)
    parser.add_argument("--data-dir", type=Path, default=data_home())
    parser.add_argument("--open", action="store_true", dest="open_browser")
    args = parser.parse_args()
    ui = BUNDLE / "dist"
    if not (ui / "index.html").is_file():
        parser.exit(1, "Falta la interfaz. Ejecuta npm ci y npm run build.\n")

    handler = partial(StudioHandler, directory=str(ui), data_dir=args.data_dir,
                      local_only=args.host in {"localhost", "127.0.0.1"})
    try:
        with ThreadingHTTPServer((args.host, args.port), handler) as server:
            url = f"http://127.0.0.1:{server.server_port}"
            if frozen and sys.platform == "win32":
                desktop(server, url)
            else:
                print(f"Mosaico Studio: {url}", flush=True)
                if args.open_browser:
                    Timer(0.2, webbrowser.open, args=[url]).start()
                server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
