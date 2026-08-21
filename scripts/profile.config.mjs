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

  // Where each attribute's bar hits 100. Set these to what a strong year looks
  // like for you; anything above simply pins the bar rather than overflowing.
  caps: {
    commits: 2000,
    reviews: 300,
    issues: 400,
    streak: 60,
    reach: 250,      // followers + stars
    range: 20,       // repositories contributed to
  },

  achievements: [
    { icon: '🌱', label: 'Account 8 years old', when: (s) => s.accountYears >= 8, color: '#3fb950' },
    { icon: '🔥', label: '30-day streak',       when: (s) => s.streak >= 30,      color: '#d29922' },
    { icon: '🛠', label: '1000 commits',        when: (s) => s.commits >= 1000,   color: '#bc8cff' },
    { icon: '👀', label: '100 reviews',         when: (s) => s.reviews >= 100,    color: '#39d0d8' },
    { icon: '⭐', label: 'First star',           when: (s) => s.stars >= 1,        color: '#d29922' },
  ],
};
