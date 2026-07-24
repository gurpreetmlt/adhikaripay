# InstantPay — Overview

> Source: InstantPay developer docs — Overview page. Raw reference (not implemented). **Implement cheat-sheet:** [`OVERVIEW_DETAILS.md`](OVERVIEW_DETAILS.md). Implemented rails: `../AEPS.md`, `../DMT.md`, etc.

**Provider:** InstantPay
**Doc type:** Platform overview (not a rail)
**Last updated:** 2026-07-20

---

## What is Instantpay and what does it offer?

Instantpay offers an **API-driven platform** that empowers businesses to seamlessly integrate financial services into their operations. **By aggregating multiple financial entities, including banks, payment processors, and other regulated institutions**, we simplify the integration process, allowing companies to focus on scaling their business and enhancing the user experience.

Our platform is built to handle complex backend operations while offering multi-bank support with minimal technical effort. With Instantpay, you can connect & manage existing bank accounts, and consolidate banking, payments, accounting, and expense management in a single interface.

### Product offerings

| Product | Link (docs) | Capabilities |
|---------|-------------|--------------|
| **Connected Banking** | [Banking overview](https://developers.instantpay.in/reference/banking-overview) | A/C Management, Payouts, Collections, Reconciliation, Reporting |
| **Instantpay Payments** | [Payouts API](https://developers.instantpay.in/reference/payouts-api) | Static QR, POS |
| **Instantpay Cards** | [Gift Cards](https://developers.instantpay.in/reference/gift-cards) | Gift Card, Expense Card |
| **Instantpay Payouts** | [Payouts API](https://developers.instantpay.in/reference/payouts-api) | Single Payout, Bulk Payout, Payout Links |
| **Instantpay Identity** | [Identity verification overview](https://developers.instantpay.in/reference/identity-verification-overview) | Financial Verification, Individual Verification, Business Verification, GEO Intelligence, AI/ML |

---

## API Basics

APIs are the building blocks that enable systems to interact. When you check a bank balance or make payments through an app, APIs retrieve real-time data, enable secure transactions, and ensure smooth operations.

Instantpay's API-driven solutions simplify complex financial transactions and integrate with diverse systems. APIs let businesses access crucial info in real-time, automate processes, and scale operations — verify payments, process bills, and manage large financial data — so businesses can focus on growth.

Instantpay's API infrastructure aims for reliability, security, and scalability: real-time data access, financial transaction support, and payment processing for a seamless customer experience. Businesses can optimize operations without managing multiple platforms or systems.

---

## What is an API?

APIs (Application Programming Interfaces) are a bridge between apps. They let different systems communicate and exchange data and functions.

For businesses, APIs can:

- Streamline operations by connecting internal tools with third-party platforms
- Reduce the need for custom solutions
- Help organisations scale quickly using existing infrastructure
- Reduce development time and speed up software delivery

APIs should do more than connect systems — they should drive innovation and help create connected ecosystems that meet customer and operational needs. Long-term value: efficiency, lower costs, and staying at the tech forefront.

---

## Kinds of APIs

### Public API

Public (open) APIs allow developers and businesses to access services with relatively few restrictions. They typically require registration and an API key. Goals: spark innovation and enable new integrations across industries so companies can use existing services instead of building from scratch.

Examples: some APIs (e.g. Crunchbase) are free for wide use; others (e.g. Google Maps) require authentication with limited access. Public APIs usually have usage terms and may include rate limits for fairness.

### Open API Standard

The OpenAPI standard (formerly Swagger) defines a framework for public APIs — endpoint conventions, data formats, error handling. It promotes consistency and offers tools that automate coding (mock servers, docs generation, quality checks).

Not all "open" APIs follow OpenAPI. Some predate the spec; others may be private but still follow OpenAPI guidelines without public access.

### Private / Internal API

Internal (private) APIs are for limited use within a company — not for external access. In-house developers use them to integrate internal systems. They often handle proprietary data with strong security (logging, authentication, load-balancing) and are customized for the organization's needs.

### Partner API

Partner APIs sit between public and private APIs. They enable secure data exchange for a specific business purpose; only approved partners can access them.

Examples:

- HR connecting to a payroll provider (each business only accesses its employees' data)
- Personal finance apps linking bank info with retirement tools

Partner APIs support strategic, data-driven partnerships without compromising security or data integrity.

---

## API Protocols

### REST API

REST (Representational State Transfer) is a popular API protocol because of its simplicity and flexibility. Unlike protocols that require complex wrapping like XML, REST uses URLs for a straightforward structure. Developers define routes and use HTTP for communication.

**Limits:** REST mainly uses HTTP and text-based data. Formats like JSON or XML extend functionality (including images/audio, still encoded as text). Weak enforcement means providers and consumers must make systems error-resilient and handle unexpected inputs. Flexibility enables platform-agnostic data exchange.

**Architectural principles:**

| Principle | Meaning |
|-----------|---------|
| Client-server | Client interface is distinct from the server's data storage |
| Statelessness | Each API call is independent; no reliance on prior interactions |
| Cacheability | Responses may be cached per the specs |
| Layered system | Works the same through proxies, load balancers, and other intermediaries |

REST's ease of use and flexibility make it a top choice for API integrations across platforms. **InstantPay primarily uses REST.**

### SOAP API

SOAP (Simple Object Access Protocol) exchanges data over a structured framework. Unlike REST (mainly HTTP), SOAP can communicate across protocols like TCP and SMTP.

**Traits:** XML-only, strict request formatting, predictable exchanges. Strong for complex/critical transmissions (finance, enterprises like Salesforce) — error handling, stateful operations, data integrity and security. More complex and bandwidth-heavy, but standardized and reliable for structured enterprise data sharing.

### RPC API

RPC (Remote Procedure Call) APIs are **action-oriented** — they execute predefined methods on the server rather than managing documents/data like REST or SOAP. A call runs a function, then confirms completion or reports errors.

**Security:** Usually private; high trust between client and server; only authorized users trigger critical actions. Ideal for distributed client-server systems so front-end can call server methods remotely.

**gRPC** (Google's extension): HTTP/2 + Protocol Buffers → faster serialization and communication. High-performance environments benefit; browser apps may need a proxy (extra complexity).

### GraphQL API

GraphQL is a query language more flexible than traditional REST. **Single endpoint** instead of many fixed endpoints; clients request only the data they need via custom queries.

**Trade-offs:** Consumers must understand the data structure; caching can be harder; consistent query syntax is on the consumer. Choose GraphQL for flexibility; choose REST for simpler, faster deployments.

---

## API Endpoint

An API endpoint is a specific URL that represents a resource or function — the gateway where web/mobile apps send requests to access data or services on a server. Each endpoint handles distinct operations (retrieve data, update info, enable a transaction) and enables client ↔ server communication.

Endpoints are the structured pathways of modern apps (e.g. e-commerce product list, financial payment submit). They keep systems in sync, support real-time features, and underpin scalable e-commerce and fintech solutions.

### How API endpoints work

| Concept | Detail |
|---------|--------|
| **Endpoint definition** | Linked to a specific resource/function; documented in the API docs |
| **URL structure** | Base URL (server) + path (resource/function) |
| **Request parameters** | In URL or body — filtering, search, auth; targeted requests reduce load |
| **Response** | Status code (success/error) + requested data or error message |

### HTTP methods

| Method | Purpose |
|--------|---------|
| **GET** | Retrieve data from the server |
| **POST** | Send data / create resources (and related operations) |
| **PUT** | Update an existing resource (usually requires auth) |
| **DELETE** | Remove resources (needs strong security to avoid unintended deletes) |

### Best practices for designing endpoints

1. **Media types** — Support formats like JSON and XML for broader client compatibility.
2. **Auth** — API keys or OAuth tokens; only authorized users access sensitive data.
3. **RESTful principles** — Correct HTTP methods; organize endpoints around resources.
4. **Clear URL design** — Descriptive, hierarchical, easy to navigate.
5. **Versioning** — Via URL (`/v1/`), headers, or query params so updates don’t break clients.
6. **Consistent naming** — Uniform names for URLs, IDs, and request/response properties.
7. **Status codes & headers** — e.g. `200` OK, `201` Created, `400` Bad Request, `500` Server Error; headers for rate limits / pagination.
8. **Pagination & filtering** — For large datasets; avoid huge single responses.
9. **Security** — HTTPS in transit; API keys / OAuth / JWT for access.
10. **Documentation** — Endpoint descriptions, request formats, samples, response structures, error handling.
11. **Testing & monitoring** — Unit, integration, load tests; monitor performance and bottlenecks.

---

## Testing Credentials in API Integration

Testing credentials ensure processes work before going live. They are platform-specific, tailored to chosen API modules, and used in a safe controlled environment that simulates production without risking live systems.

| Concept | Detail |
|---------|--------|
| **Testing credentials** | Per-platform set for selected modules; staging only |
| **Staging environment** | Isolated mirror of live; exclusive use for test credentials |
| **Live transition** | After testing + formalities, InstantPay issues **separate production credentials** |
| **Collaboration** | Work with InstantPay team during testing for questions and alignment |

Credentials are unique to a platform — do **not** share within the org without consent, or with external partners.

### How to test the APIs

While boarded on the test environment (**Staging**), InstantPay issues credentials for each chosen module:

| Credential | Description |
|------------|-------------|
| `client_id` | Unique id assigned to each client |
| `client_secret` | Client-specific password/secret key to access the account |
| `module_secret` | Module secret to access certain APIs within a module |
| `provider_secret` | (Some modules only) Provider secret for certain APIs in a module |

---

## JWT (JSON Web Token)

JWT is an open standard ([RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519)) for securely transmitting information between parties as a JSON object.

- Generate JWT via InstantPay **Auth API** with a `grant_type` in the request body
- Supported grant types: `client_credentials` · `refresh_token` · `user_credentials`
- Default JWT validity: **15 minutes**

### Generate JWT with Client Credentials

| Parameter | Description |
|-----------|-------------|
| `grant_type` | Must be `client_credentials` |
| `client_id` | Client id issued by InstantPay |
| `client_secret` | Client secret issued by InstantPay |

### Generate JWT with Refresh Token

| Parameter | Description |
|-----------|-------------|
| `grant_type` | Must be `refresh_token` |
| `refresh_token` | Refresh token returned when creating JWT |

### Generate JWT with User Credentials

| Parameter | Description |
|-----------|-------------|
| `grant_type` | Must be `user_credentials` |
| `email` | Email registered for the customer at InstantPay |
| `password` | Dashboard password for that email |

### How to use JWT in InstantPay APIs

Once generated, JWT can replace `client_id` + `client_secret` in API authorization:

- Pass JWT in **headers** instead of client credentials
- All InstantPay APIs work with **both** methods: Client Credentials **and** JWT
