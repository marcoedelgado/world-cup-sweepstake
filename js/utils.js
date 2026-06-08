export function escape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function ownerTag(name) {
  return name ? `<span class="pn-owner-tag">${escape(name)}</span>` : '';
}

export function flag(t) {
  return t?.flag ?? '🏳️';
}

export function formatGd(gd) {
  if (gd > 0) return `+${gd}`;
  if (gd < 0) return `−${Math.abs(gd)}`;
  return '0';
}
