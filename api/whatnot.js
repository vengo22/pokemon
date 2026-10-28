// Vercel-Funktion: liest das öffentliche Whatnot-Profil und liefert Live-Status und Zahlen für die Startseite.
// Aufruf: /api/whatnot (Standard crashketchum) oder /api/whatnot?u=name, mit &debug=1 für Fehlersuche.
// Whatnot hat keine offene Schnittstelle dafür. Die Werte stehen als JSON im HTML der Profilseite,
// deshalb wird gesucht statt fest geparst. Ändert Whatnot die Seite, kommen einzelne Werte als null zurück.

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

// Feldnamen, wie sie bei Whatnot vorkommen (mehrere Varianten, erste passende gewinnt)
const KEYS = {
  followers: ['followerCount', 'followersCount', 'numFollowers'],
  sold: ['soldCount', 'itemsSoldCount', 'numItemsSold', 'totalSold'],
  rating: ['sellerRating', 'overallRating', 'averageRating', 'rating'],
  reviews: ['reviewCount', 'numReviews', 'totalReviews'],
  live: ['isLive', 'isLiveNow', 'currentlyLive']
};

function grab(text, key) {
  // passt auf "key":123 und auf \"key\":123 (JSON in JSON) und auf true/false
  const re = new RegExp('\\\\?"' + key + '\\\\?"\\s*:\\s*(-?\\d+(?:\\.\\d+)?|true|false|\\{\\s*\\\\?"(?:overall|average|value)\\\\?"\\s*:\\s*-?\\d+(?:\\.\\d+)?)');
  const m = text.match(re);
  if (!m) return undefined;
  const v = m[1];
  if (v === 'true') return true;
  if (v === 'false') return false;
  const n = v.match(/-?\d+(?:\.\d+)?$/);
  return n ? Number(n[0]) : undefined;
}

function pick(text, keys) {
  for (const k of keys) { const v = grab(text, k); if (v !== undefined) return { v, k }; }
  return null;
}

// davor: der letzte Treffer liegt am nächsten am Namen
function pickLast(text, keys) {
  let best = null;
  for (const k of keys) {
    const i = text.lastIndexOf('"' + k + '\\"') >= 0 ? text.lastIndexOf('"' + k + '\\"') : text.lastIndexOf('"' + k + '"');
    if (i >= 0 && (!best || i > best.i)) { const v = grab(text.slice(Math.max(0, i - 1)), k); if (v !== undefined) best = { v, k, i }; }
  }
  return best;
}

module.exports = async (req, res) => {
  const q = req.query || {};
  const user = /^[A-Za-z0-9_.-]{1,40}$/.test(q.u || '') ? q.u : 'crashketchum';
  const profile = 'https://www.whatnot.com/user/' + user;
  const out = { ok: false, user, profile, live: null, liveUrl: null, followers: null, rating: null, reviews: null, sold: null, checked: new Date().toISOString() };
  const dbg = {};
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(profile, { signal: ctl.signal, redirect: 'follow', headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml', 'accept-language': 'de-DE,de;q=0.9,en;q=0.8' } });
    clearTimeout(t);
    const html = await r.text();
    dbg.status = r.status; dbg.length = html.length;
    if (!r.ok) throw new Error('Whatnot antwortet mit ' + r.status);

    // Ausschnitt rund um den eigenen Benutzernamen bevorzugen (Seite enthält auch andere Verkäufer)
    const lower = html.toLowerCase();
    const at = lower.search(new RegExp('\\\\?"username\\\\?"\\s*:\\s*\\\\?"' + user.toLowerCase().replace(/\./g, '\\.') + '\\\\?"'));
    // erst hinter dem Namen suchen (gleiches Objekt), dann davor, dann ganze Seite
    const after = at >= 0 ? html.slice(at, at + 6000) : '', before = at >= 0 ? html.slice(Math.max(0, at - 3000), at) : '';
    dbg.userFound = at >= 0;

    for (const [field, keys] of Object.entries(KEYS)) {
      let hit = null, where = '';
      for (const [w, part] of [['dahinter', after], ['davor', before], ['global', html]]) {
        if (part && (hit = w === 'davor' ? pickLast(part, keys) : pick(part, keys))) { where = w; break; }
      }
      if (hit) { out[field] = hit.v; dbg[field] = hit.k + ' (' + where + ')'; }
    }
    if (typeof out.live !== 'boolean') out.live = null;
    if (typeof out.rating === 'number' && (out.rating <= 0 || out.rating > 5)) out.rating = null;

    // Laufende Show: Link auf /live/<id> im Ausschnitt
    const lm = (after || html).match(/\/live\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    if (lm) out.liveUrl = 'https://www.whatnot.com/live/' + lm[1];
    if (out.live === null && /"(?:status|showStatus)"\s*:\s*"(?:PLAYING|LIVE|live)"/.test(after)) out.live = true;

    // Fallback Follower aus der Seitenbeschreibung ("1.234 Follower" / "1,234 followers")
    if (out.followers === null) {
      const fm = html.match(/([\d.,]+\s*[kKmM]?)\s*(?:followers|Follower)/);
      if (fm) {
        let s = fm[1].trim(), mul = 1;
        if (/[kK]$/.test(s)) { mul = 1e3; s = s.slice(0, -1); } else if (/[mM]$/.test(s)) { mul = 1e6; s = s.slice(0, -1); }
        out.followers = Math.round((mul > 1 ? parseFloat(s.replace(',', '.')) : parseInt(s.replace(/[.,]/g, ''), 10)) * mul) || null;
        dbg.followers = 'text';
      }
    }
    out.ok = out.live !== null || out.followers !== null || out.sold !== null || out.rating !== null;
    if (!out.ok) out.error = 'Keine Daten auf der Profilseite gefunden';
  } catch (e) {
    out.error = String(e && e.message || e);
  }
  if (q.debug) out.debug = dbg;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('access-control-allow-origin', '*');
  // eine Minute im Vercel-Cache, damit Whatnot nicht bei jedem Besucher abgefragt wird
  res.setHeader('cache-control', out.ok ? 'public, s-maxage=60, stale-while-revalidate=240' : 'public, s-maxage=20');
  res.status(200).send(JSON.stringify(out));
};
