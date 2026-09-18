/**
 * One list of pages, filtered by role.
 * `phone` marks the four that appear in the bottom bar on a small screen.
 */
export const NAV_ITEMS = [
  { to: '/app',            key: 'nav.dashboard', icon: '\u25C9', roles: ['admin', 'treasurer', 'secretary', 'member'], phone: true, end: true },
  { to: '/app/savings',    key: 'nav.savings',   icon: '\u25B2', roles: ['admin', 'treasurer', 'secretary'], phone: true },
  { to: '/app/loans',      key: 'nav.loans',     icon: '\u25C6', roles: ['admin', 'treasurer', 'secretary', 'member'], phone: true },
  { to: '/app/members',    key: 'nav.members',   icon: '\u25CF', roles: ['admin', 'treasurer', 'secretary'] },
  { to: '/app/meetings',   key: 'nav.meetings',  icon: '\u25A0', roles: ['admin', 'treasurer', 'secretary', 'member'] },
  { to: '/app/welfare',    key: 'nav.welfare',   icon: '\u2665', roles: ['admin', 'treasurer', 'secretary', 'member'] },
  { to: '/app/fines',      key: 'nav.fines',     icon: '\u25B3', roles: ['admin', 'treasurer', 'secretary', 'member'] },
  { to: '/app/shareout',   key: 'nav.shareout',  icon: '\u2726', roles: ['admin', 'treasurer', 'secretary', 'member'] },
  { to: '/app/requests',   key: 'nav.requests',  icon: '\u25BD', roles: ['admin', 'treasurer', 'secretary', 'member'] },
  { to: '/app/messages',   key: 'nav.messages',  icon: '\u2709', roles: ['admin', 'treasurer', 'secretary'] },
  { to: '/app/cycles',     key: 'nav.cycles',    icon: '\u25D4', roles: ['admin'] },
  { to: '/app/activity',   key: 'nav.activity',  icon: '\u2261', roles: ['admin', 'treasurer', 'secretary'] },
  { to: '/app/settings',   key: 'nav.settings',  icon: '\u2699', roles: ['admin', 'treasurer', 'secretary'] },
  { to: '/app/profile',    key: 'nav.profile',   icon: '\u25CB', roles: ['admin', 'treasurer', 'secretary', 'member'], phone: true },
];

export const navFor = (role) => NAV_ITEMS.filter((i) => i.roles.includes(role));
