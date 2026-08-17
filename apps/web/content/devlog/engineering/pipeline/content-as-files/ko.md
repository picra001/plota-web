---
title: "폴더가 곧 목차다"
description: "글의 위치를 데이터베이스가 아니라 디렉터리로 정합니다. 옮기면 목차가 따라옵니다."
---

콘텐츠 계층을 표현하는 방법은 두 가지입니다. 하나는 각 글에 `category` 같은 필드를 달아 가상 트리를 만드는 것이고, 다른 하나는 실제 디렉터리를 그대로 쓰는 것입니다. 우리는 두 번째를 택했습니다.

## 규약

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

`{locale}.md` 를 하나라도 가진 디렉터리는 글이고, 그렇지 않으면 폴더입니다. 폴더의 표시 이름과 순서는 `_folder.yml` 에 둡니다. 깊이 제한은 없습니다.

## 이 선택이 주는 것

- **드래그로 편집** — 탐색기에서 폴더를 옮기면 사이드바 목차가 그대로 따라옵니다.
- **리뷰 가능한 이동** — 구조 변경이 `git mv` 한 줄로 diff에 남습니다.
- **동기화 문제 없음** — 메타데이터와 실제 위치가 어긋날 수 없습니다. 같은 것이니까요.

## 대신 지켜야 할 것

slug은 섹션 안에서 유일해야 합니다. URL은 `/ko/devlog/{slug}` 형태를 유지하기 때문에, 글을 다른 폴더로 옮겨도 링크가 깨지지 않습니다. 폴더는 읽는 사람을 위한 지도이지, 주소 체계가 아닙니다.
