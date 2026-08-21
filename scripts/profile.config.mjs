// Everything the character sheet cannot measure with a read:user token.
// Edit this file, not the generated SVG.

export default {
  login: 'akhilvarma01',
  name: 'AKHIL VARMA ALLURI',
  title: 'Application Developer, Elastic Suite',

  // Declared, not measured. A read:user token cannot see repository languages,
  // and that is the point — measuring them would require read access to
  // Emeraldx source. Set these by hand and keep them honest.
  languages: [
    { name: 'TypeScript', pct: 88 },
    { name: 'Payload CMS', pct: 74 },
    { name: 'React / Next', pct: 70 },
    { name: 'PostgreSQL', pct: 52 },
    { name: 'Docker', pct: 38 },
  ],

  // Where each bar hits 100%. These are calibrated against your first real
  // sync (144 commits, 181 reviews, 8-day streak, 6 repos), not against some
  // imagined engineer — the previous values were guesses and left four bars
  // nearly empty. A full bar means "a strong year by your own standard"; the
  // caption under each one always prints the raw count, so the honest number
  // is on the page regardless of where the cap sits.
  caps: {
    commits: 300,
    reviews: 250,
    prs: 200,
    streak: 30,
    reach: 10,       // followers + stars, genuinely low and left that way
    range: 12,       // repositories contributed to
  },

  // Thresholds you can actually cross. Milestones nobody reaches are just
  // five padlocks in a row.
  achievements: [
    { icon: '🌱', label: 'Account 8 years old', when: (s) => s.accountYears >= 8, color: '#3fb950' },
    { icon: '👀', label: '100 reviews',         when: (s) => s.reviews >= 100,    color: '#39d0d8' },
    { icon: '📈', label: '500 contributions',   when: (s) => s.total >= 500,      color: '#bc8cff' },
    { icon: '🔥', label: '7-day streak',        when: (s) => s.streak >= 7,       color: '#d29922' },
    { icon: '⭐', label: 'First star',           when: (s) => s.stars >= 1,        color: '#d29922' },
  ],
};
