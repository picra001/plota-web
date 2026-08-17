---
title: "The folder is the table of contents"
description: "A post's place is decided by the directory, not a database column. Move it and the outline follows."
---

There are two ways to express a content hierarchy. One is to tag every post with a `category` field and assemble a virtual tree. The other is to use real directories. We picked the second.

## The convention

```text
content/devlog/
  engineering/
    _folder.yml
    read-only-on-purpose/
      meta.yml
      ko.md  en.md  ja.md  zh.md  es.md
    pipeline/
      _folder.yml
      content-as-files/
        meta.yml
        ko.md
```

A directory holding at least one `{locale}.md` is a post; anything else is a folder. A folder's display name and ordering live in `_folder.yml`. There is no depth limit.

## What it buys

- **Edit by dragging** — move a folder in the file explorer and the sidebar outline follows.
- **Reviewable moves** — a structural change shows up as one `git mv` in the diff.
- **Nothing to sync** — metadata and actual location cannot drift apart, because they are the same thing.

## What it asks in return

Slugs must be unique within a section. URLs stay in the `/ko/devlog/{slug}` shape, so moving a post between folders never breaks a link. Folders are a map for the reader, not an addressing scheme.
