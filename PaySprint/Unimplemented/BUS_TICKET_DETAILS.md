# PaySprint — Bus Ticket Booking — Implementation Details

> Compact cheat-sheet. Full: [`BUS_TICKET.md`](BUS_TICKET.md).
**Base URL (Live):** `https://api.paysprint.in/service-api/api/v1/service`
**Last updated:** 2026-07-20

## 1. What it is

RedBus-powered bus booking via PaySprint (URL or raw APIs).

## 2. Auth

JWT `Token` + UAT `Authorisedkey`. Env: `PAYSPRINT_*` (see AUTHENTICATION_DETAILS).

## 3. Page / API matrix

| # | Page / API | Endpoint | Status |
|---|------------|----------|--------|
| 1 | generate-url-2 | `POST /bus/generateurl` | 📄 |
| 2 | generate-url-2 | `POST /bus/generateurl` | 📄 |
| 3 | get-source-city | `POST /bus/ticket/source` | 📄 |
| 4 | get-available-trips | `POST /bus/ticket/availabletrips` | 📄 |
| 5 | get-current-trip-details | `POST /bus/ticket/tripdetails` | 📄 |
| 6 | get-boarding-point-detail | `POST /bus/ticket/boardingPoint` | 📄 |
| 7 | block-ticket | `POST /bus/ticket/blockticket` | 📄 |
| 8 | book-ticket | `POST /bus/ticket/bookticket` | 📄 |
| 9 | check-booked-ticket | `POST /bus/ticket/check_booked_ticket` | 📄 |
| 10 | get-booked-ticket | `POST /bus/ticket/get_ticket` | 📄 |
| 11 | get-cancelation-data | `POST /bus/ticket/get_cancellation_data` | 📄 |
| 12 | ticket-cancelation | `POST /bus/ticket/cancel_ticket` | 📄 |

## 4. Implement fields

Decide webview vs raw. Raw needs full seat/boarding UX. Debit wallet on book — confirm.

## 5. Flows

### Webview path
1. `bus/generateurl` → open URL → callback

### Raw API path
1. source → availabletrips → tripdetails → boardingPoint
2. blockticket → bookticket
3. check_booked_ticket / get_ticket
4. get_cancellation_data → cancel_ticket


## 6. Gotchas

- Duplicate OpenAPI path `/bus/generateurl`
- Large trip payloads — paginate/cache
- FAQ section in PDF

## 7. Provider checklist

- [x] Bus APIs captured
- [ ] Import Postman collection
- [ ] Cancellation policy

## Source

[`BUS_TICKET.md`](BUS_TICKET.md) · [`AUTHENTICATION.md`](AUTHENTICATION.md)
