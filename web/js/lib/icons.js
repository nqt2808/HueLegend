const paths = {
  home: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  route: '<circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 5h9a4 4 0 0 1 0 8H8a4 4 0 0 0 0 8h7"/>',
  shield: '<path d="M12 3 4.5 6v5c0 4.8 3 8 7.5 10 4.5-2 7.5-5.2 7.5-10V6L12 3Z"/><path d="m8.5 12 2.3 2.3 4.7-4.7"/>',
  wallet: '<path d="M20 8V6a2 2 0 0 0-2-2H6a3 3 0 0 0 0 6h15v10H5a2 2 0 0 1-2-2V7"/><path d="M21 13h-5v4h5"/>',
  settings: '<path d="m9 3-1 3-3 1-2 4 2 3v3l4 3 3-1 3 1 4-3v-3l2-3-2-4-3-1-1-3Z"/><circle cx="12" cy="11.5" r="3"/>',
  key: '<circle cx="8" cy="8" r="5"/><path d="m11.5 11.5 9 9M16 16l2-2M18.5 18.5l2-2"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  external: '<path d="M14 3h7v7m0-7-11 11M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',
  camera: '<path d="M8 5 6 8H3v12h18V8h-3l-2-3Z"/><circle cx="12" cy="13" r="4"/>',
  qr: '<path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h3v3h3v3h-6zM21 12v3M12 3v4M12 10v3H9M3 12h3M12 17v4"/>',
  box: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 5v10l9 5 9-5V8M12 13v10M7 5.8l9 5"/>',
  leaf: '<path d="M20 3c-9 0-16 3-16 10a7 7 0 0 0 7 7c7 0 9-8 9-17Z"/><path d="M3 22 16 8M9 16v-5m0 5h5"/>',
  bowl: '<path d="M3 12h18c0 5-4 9-9 9s-9-4-9-9ZM7 8c-2-2 2-3 0-5m5 5c-2-2 2-3 0-5m5 5c-2-2 2-3 0-5"/>',
  hat: '<path d="m2 17 10-13 10 13c-5 4-15 4-20 0ZM2 17c6-2 14-2 20 0M12 4l-3 12"/>',
  bottle: '<path d="M9 3h6v5l3 4v9H6v-9l3-4V3ZM9 6h6M6 14h12"/>',
  pin: '<path d="M19 10c0 6-7 11-7 11S5 16 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  time: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.5"/>',
  alert: '<path d="m12 3 10 18H2L12 3ZM12 9v5m0 3v.5"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5M19.5 7A8 8 0 0 0 5 6m-.5 11A8 8 0 0 0 14 3"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  logout: '<path d="M10 3H4v18h6m4-5 5-4-5-4m-6 4h11"/>',
  file: '<path d="M14 2H5v20h14V7l-5-5ZM14 2v6h5M8 12h8M8 16h6"/>',
  truck: '<path d="M3 5h11v12H3ZM14 9h4l3 4v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  store: '<path d="M3 10 5 3h14l2 7M4 10v11h16V10M2 10h20M9 21v-7h6v7"/>',
  link: '<path d="m9 15 6-6M7 17l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m4-1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(2 0)"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 0 1 6 0c0 3-3 2-3 5m0 4v.3"/>'
};
export function icon(name, cls = "") {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.box}</svg>`;
}
export function logo() {
  return '<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M5 16h30M9 13h22M12 9h16M17 5h6M7 17v14m26-14v14M4 32h32M12 19v10m16-10v10M17 31v-9a3 3 0 0 1 6 0v9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 16c3-1 4-2 4-3m22 0c0 1 1 2 4 3" stroke="currentColor" stroke-width="2"/></svg>';
}
