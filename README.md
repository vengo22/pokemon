# Fangrunde für crashketchum

Overlay und Steuerseite für die Pokémon-Fangrunden im Whatnot-Stream.

- **index.html**: Steuerseite für Chris (mit Code geschützt). Hier werden Preise verteilt, Käufer und Pokémon eingetragen und die Fänge gestartet. Der Tab „Gewinner“ zeigt, wer was gewonnen hat.
- **obs.html**: Browserquelle für OBS (1080 × 1920, transparent). Zeigt Fang-Animation und Übersicht im Stream.

Live über Vercel (jeder Push auf `main` geht automatisch online):
- Steuerseite: https://crashketchum.de/
- OBS-Browserquelle: https://crashketchum.de/obs.html

Zusätzlich über GitHub Pages: https://vengo22.github.io/pokemon/

Die Steuerseite schickt den Spielstand über den OBS-WebSocket-Server (OBS 28 oder neuer, Port 4455) an die Browserquelle. Dafür in OBS unter *Werkzeuge → WebSocket-Servereinstellungen* den Server einschalten und das Passwort im Tab „OBS“ der Steuerseite eintragen.

## Ändern

Die Quelle liegt in `quelle/`. Nach Änderungen an `quelle/src.html` im Ordner `quelle` `python3 build.py` ausführen. Das baut `index.html` und `obs.html` neu.

Pokémon-Bilder: offizielle Artworks über PokeAPI. Namensschrift: Luckiest Guy (Apache-2.0).
