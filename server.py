#!/usr/bin/env python3
import http.server
import socketserver
import os

PORT = 3000

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory='.next', **kwargs)

print(f'Starting server on http://localhost:{PORT}')
print(f'Serving files from: {os.path.abspath(".next")}')

with socketserver.TCPServer(('', PORT), MyHandler) as httpd:
    print(f'Server running at http://localhost:{PORT}/')
    httpd.serve_forever()
