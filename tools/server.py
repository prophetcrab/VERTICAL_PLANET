import http.server
import socketserver
import os
import json
import base64
import re

ROOT = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(ROOT, 'shots')
FILM = os.path.join(ROOT, 'film_frames')
os.makedirs(SHOTS, exist_ok=True)
os.makedirs(FILM, exist_ok=True)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):
        pass

    def do_POST(self):
        if not self.path.startswith('/shot'):
            self.send_error(404)
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            raw = self.rfile.read(length)
            payload = json.loads(raw.decode('utf-8'))
            name = payload.get('name', 'shot')
            # Keep only a safe filename, but preserve the leading prefix so
            # fNNNNN frames land in film_frames and everything else in shots.
            name = re.sub(r'[^A-Za-z0-9_-]', '', name)
            data = payload.get('data', '')
            if ',' in data:
                data = data.split(',', 1)[1]
            blob = base64.b64decode(data)
            target_dir = FILM if re.match(r'^f\d{5}$', name) else SHOTS
            ext = '.webp' if blob[:4] == b'RIFF' else '.png'
            path = os.path.join(target_dir, name + ext)
            with open(path, 'wb') as f:
                f.write(blob)
            body = json.dumps({'ok': True, 'path': path, 'bytes': len(blob)}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except Exception as exc:
            body = json.dumps({'ok': False, 'error': str(exc)}).encode()
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)


class ReuseServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == '__main__':
    with ReuseServer(('127.0.0.1', 8765), Handler) as httpd:
        print('serving', ROOT, flush=True)
        httpd.serve_forever()
