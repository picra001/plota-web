---
title: "Static rendering as the default"
description: "Nothing is computed per request. We settle it once at build time and spend the rest of the budget on the writing."
---

On a read-only site the server has almost nothing to do per request. The posts are already written, nobody logs in, and there is nothing to personalize. Yet plenty of sites still reach for a database on every page view.

## What build time settles

Three things are fixed at build time.

- Which posts exist — one pass over the file system answers it.
- Which languages a post ships in — decided by the presence of `{locale}.md`.
- Which folder a post belongs to — the directory path *is* the hierarchy.

None of these depend on the request, so none of them need to be recomputed per request.

## Where the budget goes

Making static the default drives the server bill close to zero. That budget moves to image quality, translation, and the writing itself. Better to have something worth reading than an infrastructure diagram worth admiring.

> Precompute what can be precomputed. Let the browser do the rest.
