Jerome Etienne #ARjs (@jerome_etienne)

  - Bio: Making WebAR a reality! Around Javascript and WebGL — 8th most
  active user on github — Write @learningthreejs — Ex @daqri — Code AR.js
  all day 😄
  - Location: Dublin, Ireland
  - Website: github.com/jeromeetienne/…
  - Joined: November 2007
  - Posts: ~12K
  - Following: 977
  - Followers: 7,500
  Field: Location
  Selector: generic:has(link[url$="/jerome_etienne/about"]) > generic[value]
  ────────────────────────────────────────
  Field: Website
  Selector: link[url^="https://t.co/"]
  ────────────────────────────────────────
  Field: Joined date
  Selector: link[url$="/jerome_etienne/about"]
  ────────────────────────────────────────
  Field: Following count
  Selector: link[url$="/following"]
  ────────────────────────────────────────
  Field: Followers count
  Selector: link[url$="/verified_followers"]
  ────────────────────────────────────────
  Field: Posts count
  Selector: button[name="Back"] + generic > generic:last-child

  Notes:
  - The display name and posts count are pulled from the sticky header
  (anchored on the Back button) — more stable than the body block, which has
   no unique ancestor.
  - Bio needs --with-children because the text is split across StaticText
  nodes and inline links; the :not(:has(...)) trick picks the closest
  ancestor of the @learningthreejs link.
  - All URL-anchored selectors include the handle (/jerome_etienne/...) —
  replace it for other profiles.