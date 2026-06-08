export function escape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function ownerTag(name) {
  return name ? `<span class="pn-owner-tag">${escape(name)}</span>` : '';
}

export function flag(t) {
  return t?.flag ?? '🏳️';
}
