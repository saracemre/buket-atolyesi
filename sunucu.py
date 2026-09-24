"""Buket Atölyesi yerel sunucusu: dosyaları önbelleğe alınmadan sunar,
böylece güncellemeler tarayıcıda hemen görünür."""
import http.server
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()


socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), NoCacheHandler) as httpd:
    print(f"Buket Atölyesi: http://localhost:{PORT}  (kapatmak için Ctrl+C)")
    httpd.serve_forever()
