<div align="center">

<img src="assets/hero.svg" width="880" alt="Akhil Varma — full-stack engineer">

<br>

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0a66c2?style=flat-square&logo=linkedin&logoColor=white)](https://linkedin.com/in/YOUR-HANDLE)
[![Email](https://img.shields.io/badge/Email-c9d1d9?style=flat-square&logo=gmail&logoColor=0d1117)](mailto:akhilvarma01@gmail.com)
[![Portfolio](https://img.shields.io/badge/Portfolio-bc8cff?style=flat-square&logo=vercel&logoColor=white)](https://YOUR-SITE.com)

</div>

<br>

<img src="assets/terminal.svg" width="880" alt="whoami; cat stack.json; akhil --now">

<br>

---

## 🔴 3:47 AM — you are on call

**Click a button. It's a game.** Eight endings, three decisions deep. It runs
inside GitHub's markdown renderer with no JavaScript, no server and no Actions —
every button below is a nested `<details>`, which turns out to be a perfectly
serviceable state machine.

> 📟 **PAGERDUTY — SEV1**
> `checkout-api` is returning 500s. Order success rate: **6%**.
> Your phone has been buzzing for ninety seconds.

<details>
<summary><img src="assets/btn-accept.svg" alt="Accept the page"></summary>

<br>

The dashboard is a wall of red. Orders are failing at 94%. Someone deployed
20 minutes ago.

That someone was you.

<blockquote>

<details>
<summary><img src="assets/btn-rollback.svg" alt="kubectl rollback — undo first, ask questions later"></summary>

<br>

Traffic recovers in 40 seconds. You are a hero. You are also now debugging
a bug you can no longer reproduce.

<blockquote>

<details>
<summary><img src="assets/btn-bed.svg" alt="Go back to bed"></summary>

<br>

**ENDING — "The Pragmatist"** 🛌

Monday arrives. The bug is gone, the branch is deleted, and no one remembers
what happened. Six weeks later it returns, worse, during Black Friday.

*You have unlocked: technical debt.*

</details>

<details>
<summary><img src="assets/btn-podlogs.svg" alt="Pull the pod logs before they rotate"></summary>

<br>

Smart. You catch the stack trace with four minutes to spare:

```
PayloadError: Cannot read properties of undefined (reading 'variants')
    at buildOrderLine (dist/collections/Orders.js:214)
```

A style with no variants. Seeded by an importer that ran at 03:31.

**ENDING — "The Professional"** 🏆

You write the failing test first, fix `buildOrderLine`, add a NOT NULL
constraint, and ship it at 5 AM with a post-mortem nobody asked for.

*This is the correct answer. It is also why you are tired.*

</details>

</blockquote>
</details>

<details>
<summary><img src="assets/btn-logs.svg" alt="Read the logs first"></summary>

<br>

```
PayloadError: Cannot read properties of undefined (reading 'variants')
    at buildOrderLine (dist/collections/Orders.js:214)
```

Every failing request touches the same code path. It's your deploy.

<blockquote>

<details>
<summary><img src="assets/btn-hotfix.svg" alt="Hotfix it live"></summary>

<br>

The 500s stop. The orders now succeed — silently writing line items with
`quantity: undefined` into Postgres.

**ENDING — "The Optional Chain"** ⚠️

You fixed the symptom at 4 AM and created a data-integrity incident that
finance discovers at the end of the quarter. The `?.` is still there.
It has a comment above it that says `// TODO: fix properly`.

*Nobody has ever fixed a TODO written at 4 AM.*

</details>

<details>
<summary><img src="assets/btn-proper.svg" alt="Roll back, then fix it properly"></summary>

<br>

**ENDING — "The Adult"** ☕

Rollback at 3:58. Root cause by 10 AM: the importer allows styles with zero
variants, and `buildOrderLine` assumed at least one. You add the guard, the
constraint, and the regression test.

*Boring. Correct. This is the job.*

</details>

</blockquote>
</details>

<details>
<summary><img src="assets/btn-drop.svg" alt="DROP TABLE orders;"></summary>

<br>

**ENDING — "Technically Correct"** 💀

```
Query OK, 1,284,003 rows affected (12.4 sec)
```

The alerts stop immediately. You are correct that there are no longer any
failing orders. You are correct about this for approximately 90 seconds,
which is how long it takes for a different, much louder alert to fire.

*Somewhere, a backup is being restored. It is not by you. You are unemployed.*

</details>

</blockquote>
</details>

<br>

---

## What I actually work on

Admin platforms and internal tooling — the systems that let a business run
its catalog, its orders, and its pricing without a developer in the loop.
Currently building order and catalog systems on **Next.js + Payload CMS**,
backed by Postgres.

Most of my work is the unglamorous kind: making a filter return the right
rows, making a date render in the right timezone, making a report that
finance trusts.

<br>

## Stack

<table>
<tr><td><b>Daily</b></td><td>TypeScript · Next.js · React · Payload CMS · Node.js</td></tr>
<tr><td><b>Data</b></td><td>PostgreSQL · MongoDB · Redis</td></tr>
<tr><td><b>Ship</b></td><td>Docker · GitHub Actions · Vercel · Sentry</td></tr>
<tr><td><b>Test</b></td><td>Jest · Playwright</td></tr>
</table>

<br>

## Numbers

<div align="center">

<img height="150" src="https://github-readme-stats.vercel.app/api?username=akhilvarma01&show_icons=true&hide_border=true&bg_color=0d1117&title_color=39d0d8&text_color=c9d1d9&icon_color=bc8cff">
<img height="150" src="https://github-readme-stats.vercel.app/api/top-langs/?username=akhilvarma01&layout=compact&hide_border=true&bg_color=0d1117&title_color=39d0d8&text_color=c9d1d9">

</div>

<br>

---

<div align="center">
<sub>every animation on this page is a hand-written SVG · every branch above is a nested <code>&lt;details&gt;</code> · <code>node scripts/build.mjs</code> rebuilds it all</sub>
</div>
