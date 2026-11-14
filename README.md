# action-littlelink

Builds a [LittleLink](https://github.com/sethcottle/littlelink)-style page from two
config files into a single self-contained `index.html` — no external CSS, fonts or
images, one request.

## Usage

```yaml
- uses: anotherdoesnm/action-littlelink@v1
  with:
    config-dir: .        # where site.json and links.json live
    output-dir: dist
```

## Inputs

```
site.json    { title, subtitle, avatar, footer, footerUrl, footerText, lang, theme }
links.json   [ { label, url, icon, brand, color? } ]
assets/icons/<name>.svg    icons; only the ones actually used end up in the page
assets/avatar.png          inlined into the HTML as a data URI
```

## Where the button colours come from

Not from this repository. `action.yml` downloads `css/brands.css` from
`sethcottle/littlelink` and `css/brands-extended.css` from
`sethcottle/littlelink-extended` **at a pinned commit** (inputs `littlelink-ref` and
`littlelink-extended-ref`), and the renderer keeps only the `.button-<brand>` rules
named in your `links.json` — a handful out of roughly six hundred.

Brands that upstream does not know live in `assets/brands/local.css` (currently
`arcanechat` and `email`). A brand with no CSS at all needs nothing but a colour:

```json
{ "label": "My service", "url": "https://example.org", "icon": "myservice",
  "brand": "myservice", "color": "#123456" }
```

The renderer writes the rule and picks a readable text colour from the background.

## Why a separate repository

A site repository then holds only configs and images, and updating the renderer or
the upstream styles is a tag bump (`@v1`) rather than a change in every fork.

## CI

`.github/workflows/test.yml` renders `fixtures/` with this action on every push and
asserts the result: four buttons, the upstream brand classes, a generated rule for
the unknown brand, the avatar inlined, icons deduplicated into `<symbol>`s, and a
letter badge where a link has no icon.
