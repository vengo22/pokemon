"""Baut index.html (Steuerseite) und obs.html (OBS-Browserquelle) aus quelle/src.html.
Aufruf im Ordner quelle:  python3 build.py
"""
import os
here = os.path.dirname(os.path.abspath(__file__))
rd = lambda f: open(os.path.join(here, f), encoding='utf-8').read()
art = rd('src.html').replace('__DEX__', rd('dex.json')).replace('__SPRITES__', rd('sprites.json'))

def full(a):
    head = '<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
    a = a.replace('<style>', '<style>\nbody{margin:0}\n[hidden]{display:none!important}\n', 1)
    a = a.replace('\n<div class="gate"', '\n</head>\n<body>\n<div class="gate"', 1)
    return head + a + '\n</body>\n</html>\n'

ov = art.replace('<title>Fangrunde crashketchum</title>', '<title>Fangrunde OBS</title>', 1).replace(
    '<script>\n/* ---------- Passwort-Sperre', '<script>window.FANG_OVERLAY = true;</script>\n<script>\n/* ---------- Passwort-Sperre', 1)
assert 'FANG_OVERLAY = true' in ov
out = os.path.dirname(here)
open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(full(art))
open(os.path.join(out, 'obs.html'), 'w', encoding='utf-8').write(full(ov))
print('index.html und obs.html gebaut')
