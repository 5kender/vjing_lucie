# serve.py — serveur local de développement.
#
# Équivalent de `python -m http.server`, avec `Cache-Control: no-store` en plus.
#
# Sans cet en-tête, Chrome applique une fraîcheur heuristique aux fichiers servis
# et peut resservir un .js depuis son cache sans revalider. Une modification du
# code donne alors l'impression de « ne pas marcher », ce qui coûte bien plus
# cher à diagnostiquer que les quelques lignes ci-dessous.

import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def log_message(self, fmt, *args):
        # Une ligne par requête noie la console au démarrage (30 scripts).
        pass


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = partial(NoCacheHandler, directory=".")

    with ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print("VJ -> http://localhost:%d   (Ctrl+C pour arreter)" % port)
        httpd.serve_forever()


if __name__ == "__main__":
    main()
