#!/usr/bin/env node
// Queries GitHub's GraphQL API for contribution counts and writes
// assets/stats.json. Run by .github/workflows/character-sheet.yml nightly.
//
//   STATS_TOKEN=<classic PAT, read:user> node scripts/fetch-stats.mjs
//
// The token needs read:user and nothing more. That scope returns aggregate
// contribution COUNTS — including private ones via restrictedContributionsCount
// — but cannot list repositories, read source, or clone anything. No employer
// code is reachable with it.

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import CFG from './profile.config.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const token = process.env.STATS_TOKEN;
if (!token) {
  console.error('STATS_TOKEN is not set.\n' +
    'Locally:  STATS_TOKEN=ghp_xxx node scripts/fetch-stats.mjs\n' +
    'In CI:    add STATS_TOKEN as a repository secret.');
  process.exit(1);
}

const QUERY = `
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    createdAt
    followers { totalCount }
    contributionsCollection(from: $from, to: $to) {
      totalCommitContributions
      restrictedContributionsCount
      totalPullRequestContributions
      totalPullRequestReviewContributions
      totalIssueContributions
      totalRepositoriesWithContributedCommits
      contributionCalendar {
        totalContributions
        weeks { contributionDays { contributionCount date } }
      }
    }
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC) {
      nodes { stargazerCount }
    }
  }
}`;

const to = new Date();
const from = new Date(to.getTime() - 365 * 864e5);

const res = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'character-sheet',
  },
  body: JSON.stringify({
    query: QUERY,
    variables: { login: CFG.login, from: from.toISOString(), to: to.toISOString() },
  }),
});

if (!res.ok) {
  console.error(`GitHub API returned ${res.status} ${res.statusText}`);
  console.error(await res.text());
  process.exit(1);
}

const body = await res.json();
if (body.errors) {
  console.error('GraphQL errors:', JSON.stringify(body.errors, null, 2));
  process.exit(1);
}

const u = body.data.user;
const cc = u.contributionsCollection;

// restrictedContributionsCount is every private contribution, not only
// commits, so the two are kept apart rather than summed into one "commits"
// figure that would be mislabelled.
const publicCommits = cc.totalCommitContributions;
const privateAll = cc.restrictedContributionsCount;
const commits = publicCommits + privateAll;
const prs = cc.totalPullRequestContributions;
const total = cc.contributionCalendar.totalContributions + privateAll;
const reviews = cc.totalPullRequestReviewContributions;
const issues = cc.totalIssueContributions;
const stars = u.repositories.nodes.reduce((n, r) => n + r.stargazerCount, 0);
const followers = u.followers.totalCount;
const range = cc.totalRepositoriesWithContributedCommits;
const accountYears = Math.floor((Date.now() - new Date(u.createdAt)) / (365.25 * 864e5));

// Longest run of consecutive days with at least one contribution.
const days = cc.contributionCalendar.weeks.flatMap((w) => w.contributionDays);
let streak = 0, run = 0;
for (const d of days) {
  run = d.contributionCount > 0 ? run + 1 : 0;
  if (run > streak) streak = run;
}

if (cc.restrictedContributionsCount === 0) {
  console.warn(
    '\n⚠ restrictedContributionsCount is 0.\n' +
    '  Either there genuinely are no private contributions, or the profile\n' +
    '  setting "Include private contributions on my profile" is off.\n' +
    '  Settings → Public profile → Contributions.\n'
  );
}

const pct = (n, cap) => Math.max(0, Math.min(100, Math.round((n / cap) * 100)));
const K = CFG.caps;
const raw = { total, commits, publicCommits, privateAll, prs, reviews, issues, streak, stars, followers, range, accountYears };

const C = { cyan: '#39d0d8', green: '#3fb950', amber: '#d29922', purple: '#bc8cff' };
const n = (v) => v.toLocaleString('en-US');

const stats = {
  name: CFG.name,
  title: CFG.title,
  topLanguage: CFG.languages[0]?.name ?? 'TypeScript',
  xp: total,
  syncedAt: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC',
  source: 'source: GraphQL contributionsCollection (incl. private)',
  stats: [
    { label: 'SHIP',   value: pct(commits, K.commits), from: `${n(commits)} commits · ${n(privateAll)} in private repos`, color: C.cyan },
    { label: 'REVIEW', value: pct(reviews, K.reviews), from: `${n(reviews)} pull requests reviewed`,        color: C.cyan },
    { label: 'PRS',    value: pct(prs, K.prs),         from: `${n(prs)} pull requests opened`,              color: C.cyan },
    { label: 'STREAK', value: pct(streak, K.streak),   from: `${streak}-day longest streak`,                color: C.green },
    { label: 'RANGE',  value: pct(range, K.range),     from: `${range} repositories contributed to`,        color: C.cyan },
    { label: 'REACH',  value: pct(followers + stars, K.reach), from: `${n(followers)} followers · ${n(stars)} stars (public only)`, color: C.amber },
  ],
  languages: CFG.languages,
  achievements: CFG.achievements.map(({ icon, label, when, color }) => ({
    icon, label, color, unlocked: Boolean(when(raw)),
  })),
  raw,
};

writeFileSync(join(ROOT, 'assets', 'stats.json'), JSON.stringify(stats, null, 2) + '\n');
console.log('assets/stats.json written');
console.table(raw);
