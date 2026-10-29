"""Screenshot routes of the built app.
Usage: python3 shoot.py OUT_DIR /route[,/route...] [--dist dist-x] [--dark] [--w 1440] [--role ROLE_CODE] [--full]
Prints page errors and console errors at the end."""
import sys, subprocess, time, os, http.server, threading, functools
from playwright.sync_api import sync_playwright
out = sys.argv[1]; routes = sys.argv[2].split(',')
dark = '--dark' in sys.argv
w = int(sys.argv[sys.argv.index('--w')+1]) if '--w' in sys.argv else 1440
role = sys.argv[sys.argv.index('--role')+1] if '--role' in sys.argv else None
full = '--full' in sys.argv
os.makedirs(out, exist_ok=True)
dist = sys.argv[sys.argv.index('--dist')+1] if '--dist' in sys.argv else 'dist'
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), dist)
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=root)
class Q(H.func):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Q, directory=root))
threading.Thread(target=srv.serve_forever, daemon=True).start()
port = srv.server_address[1]
errors = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': w, 'height': 2400 if full else 900}, color_scheme='dark' if dark else 'light', device_scale_factor=1)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    pg.goto(f'http://127.0.0.1:{port}/')
    if role:
        pg.evaluate(f"localStorage.setItem('ngicd.role', JSON.stringify('{role}'))")
        pg.reload()
    for r in routes:
        pg.goto(f'http://127.0.0.1:{port}/#{r}')
        pg.wait_for_timeout(500)
        name = (r.strip('/').replace('/', '_') or 'home') + ('_dark' if dark else '') + (f'_{w}' if w != 1440 else '') + (f'_{role}' if role else '')
        pg.screenshot(path=f'{out}/{name}.png')
    b.close()
srv.shutdown()
print('errors:', errors[:10])
