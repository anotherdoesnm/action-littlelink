# action-littlelink

Собирает [LittleLink](https://github.com/sethcottle/littlelink)-страницу из двух
конфигов в один самодостаточный `index.html`: без внешних CSS, шрифтов и картинок.

## Использование

```yaml
- uses: anotherdoesnm/action-littlelink@v1
  with:
    config-dir: .        # где лежат site.json и links.json
    output-dir: dist
```

## Что на входе

```
site.json    { title, subtitle, avatar, footer, footerUrl, footerText, lang, theme }
links.json   [ { label, url, icon, brand, color? } ]
assets/icons/<name>.svg    иконки, попадают в вывод только использованные
assets/avatar.png          вшивается в HTML как data-URI
```

## Откуда берутся цвета кнопок

Не из этого репозитория. `action.yml` скачивает `css/brands.css` из
`sethcottle/littlelink` и `css/brands-extended.css` из
`sethcottle/littlelink-extended` **по закреплённому коммиту** (входные параметры
`littlelink-ref` и `littlelink-extended-ref`), а сборщик вытаскивает из них ровно
те `.button-<brand>`, что названы в `links.json` — сейчас это единицы правил из
шести сотен.

Правила для брендов, которых нет в апстриме, живут в `assets/brands/local.css`
(сейчас это `arcanechat` и `email`). Своя кнопка без CSS вообще делается так:

```json
{ "label": "Мой сервис", "url": "https://example.org", "icon": "myservice", "brand": "myservice", "color": "#123456" }
```

Цвет текста сборщик подберёт по контрасту фона.

## Зачем отдельный репозиторий

Сайт-репозиторий тогда содержит только конфиги и иконки, а обновление сборщика
или апстримных стилей — это смена тега `@v1` (или пина коммита), без правок в
каждом форке.
