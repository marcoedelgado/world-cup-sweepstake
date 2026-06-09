export function escape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function ownerTag(name) {
  return name ? `<span class="pn-owner-tag">${escape(name)}</span>` : '';
}

export function flag(t) {
  return t?.flag ?? '🏳️';
}

// Match-card team label: flag + full name (desktop) / 3-letter code (mobile).
// On mobile, tap reveals a tooltip with the full name.
export function teamLabel(team, code) {
  const name = team?.name ?? code;
  return `<span class="t-team" data-full="${escape(name)}"><span class="t-flag">${flag(team)}</span><span class="t-text"><span class="t-name">${escape(name)}</span><span class="t-code">${escape(code)}</span></span></span>`;
}

export function formatGd(gd) {
  if (gd > 0) return `+${gd}`;
  if (gd < 0) return `−${Math.abs(gd)}`;
  return '0';
}
