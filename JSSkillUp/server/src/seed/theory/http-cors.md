# HTTP и CORS

## Методы и идемпотентность

| Метод | Назначение | Безопасный | Идемпотентный |
| --- | --- | --- | --- |
| GET | получить ресурс | да | да |
| HEAD | только заголовки | да | да |
| POST | создать / выполнить действие | нет | нет |
| PUT | заменить ресурс целиком | нет | да |
| PATCH | частично изменить | нет | не гарантируется |
| DELETE | удалить | нет | да |
| OPTIONS | узнать возможности (preflight) | да | да |

**Безопасный** — не меняет состояние сервера. **Идемпотентный** — повтор запроса даёт тот же
результат, что и один запрос. Важно для повторов: GET/PUT/DELETE можно безопасно повторить
при сетевой ошибке, POST — нет (двойной платёж). Для POST используют ключ идемпотентности.

## Статусы, которые стоит знать

- **2xx**: 200 OK, 201 Created, 204 No Content.
- **3xx**: 301/308 постоянный редирект, 302/307 временный, **304 Not Modified** (кеш).
- **4xx**: 400 Bad Request, **401** Unauthorized (не аутентифицирован), **403** Forbidden
  (нет прав), 404, 409 Conflict, 422 Unprocessable Entity (ошибки валидации), **429** Too
  Many Requests (с `Retry-After`).
- **5xx**: 500, 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout.

`fetch` **не отклоняет** промис на 4xx/5xx — проверять `response.ok` нужно вручную.

## Same-origin policy

**Origin** = схема + хост + порт. `https://app.com` и `https://api.app.com` — разные origin.

Same-origin policy запрещает скрипту **читать ответы** с другого origin. Без неё любой сайт
мог бы от имени пользователя, с его cookies, прочитать почту или банковский кабинет.

Важно: SOP ограничивает **чтение**, а не отправку. Форма или `<img>` могут отправить запрос
на другой сайт — отсюда CSRF.

## CORS

**Cross-Origin Resource Sharing** — механизм, которым **сервер** разрешает определённым
origin читать свои ответы:

```
Access-Control-Allow-Origin: https://app.com
Access-Control-Allow-Methods: GET, POST, PUT
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 600
```

## Простые и preflight-запросы

**Простой запрос** (без preflight): методы GET/HEAD/POST, только «безопасные» заголовки,
`Content-Type` из `application/x-www-form-urlencoded`, `multipart/form-data`, `text/plain`.
Такие запросы и раньше мог отправить обычный HTML — браузер отправляет сразу и проверяет
`Access-Control-Allow-Origin` в ответе.

Всё остальное требует **preflight**: браузер сначала отправляет `OPTIONS` с
`Access-Control-Request-Method` и `-Headers`, и только при разрешении — сам запрос.
Типичные триггеры: `Content-Type: application/json`, заголовок `Authorization`, методы
PUT/PATCH/DELETE. `Access-Control-Max-Age` кеширует ответ preflight.

## Credentials

Cookies и HTTP-авторизация на другой origin отправляются, только если:

- клиент: `fetch(url, { credentials: 'include' })` (axios — `withCredentials: true`);
- сервер: `Access-Control-Allow-Credentials: true` и **конкретный** origin, а не `*`.

Плюс cookie должна иметь `SameSite=None; Secure`, если это кросс-сайтовый запрос.

## CORS — защита пользователя, а не API

Postman и curl не применяют SOP — запрос «работает». CORS защищает **пользователя браузера**
от чужих сайтов, а не API от прямых запросов. Для защиты API нужны аутентификация,
авторизация, rate limit.

В разработке CORS обходят прокси dev-сервера (Vite `server.proxy`): для браузера фронт
и API на одном origin. В продакшене — общий домен через reverse proxy или корректные
заголовки на API.

## HTTP/2 и HTTP/3 кратко

- **HTTP/1.1**: один запрос за раз на соединение, браузер открывает ~6 соединений на домен —
  отсюда старые приёмы: склейка файлов, спрайты, шардинг доменов.
- **HTTP/2**: мультиплексирование многих запросов в одном TCP-соединении, сжатие заголовков
  (HPACK). Склейка в один огромный бандл больше не нужна — умеренное число чанков нормально.
- **HTTP/3**: поверх QUIC (UDP) — нет блокировки всех потоков из-за потери одного пакета
  (head-of-line blocking на уровне TCP), быстрее установка соединения.

## Как это спрашивают

- «Что такое CORS? Почему в Postman работает, а в браузере нет?»
- «Когда браузер отправляет preflight?»
- «Как отправить cookies на другой домен?»
- «Чем 401 отличается от 403? PUT от PATCH? Что такое идемпотентность?»
- «Что изменилось в HTTP/2 для фронтенда?»
