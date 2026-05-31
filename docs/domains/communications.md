# Communication Center

## Overview

The Communication Center domain handles outbound email and SMS messaging to church members.
It covers composing and dispatching messages, managing reusable templates, tracking per-recipient
delivery status, and respecting per-member opt-in preferences for each channel.

All message sending is asynchronous: the API creates the message record and recipient rows, then
dispatches delivery in the background without blocking the HTTP response. The current implementation
uses stub providers that log to the console. See Replacing the Stub Providers for production setup.

---

## API Endpoints

All endpoints require a valid JWT session cookie (`steward_session`).

### Messages

**Base path:** `/api/messages`

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/api/messages` | `communications.send` | Create and dispatch a message |
| GET | `/api/messages` | `communications.view` | List messages (paginated) |
| GET | `/api/messages/:id` | `communications.view` | Get a single message |
| GET | `/api/messages/:id/recipients` | `communications.view` | List recipients with delivery status |
| GET | `/api/messages/:id/stats` | `communications.view` | Delivery stats (pending/sent/failed counts) |

**POST /api/messages request body:**

```json
{
  "channel": "email",
  "subject": "Sunday Service Reminder",
  "body": "Hi {{firstName}}, join us this Sunday!",
  "target": { "type": "all" }
}
```

The `target` field is a discriminated union:

| target.type | Extra fields | Meaning |
|---|---|---|
| `all` | none | All active members |
| `memberIds` | `memberIds: string[]` | Specific members by ID |
| `status` | `status: active | inactive | visitor` | All members of a given status |

Only members with a valid contact address for the selected channel (email or phone) are included.
If no valid recipients are found, the endpoint returns 400.

**GET /api/messages query params:**

| Param | Type | Notes |
|---|---|---|
| `channel` | `email` or `sms` | Optional filter |
| `page` | `Int` | Default 1 |
| `limit` | `Int` | Default 20, max 100 |

**GET /api/messages/:id/stats response:**

```json
{ "pending": 0, "sent": 42, "failed": 3, "total": 45 }
```

### Message Templates

**Base path:** `/api/message-templates`

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/api/message-templates` | `communications.send` | Create a template |
| GET | `/api/message-templates` | `communications.view` | List templates (paginated) |
| GET | `/api/message-templates/:id` | `communications.view` | Get a single template |
| PUT | `/api/message-templates/:id` | `communications.send` | Update a template |
| DELETE | `/api/message-templates/:id` | `communications.send` | Delete a template |

**Create template request body:**

```json
{
  "name": "Sunday Reminder",
  "channel": "email",
  "subject": "See you Sunday!",
  "body": "Hi {{firstName}}, we look forward to seeing you this Sunday!"
}
```

### Opt-In Preferences

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/members/:id/opt-in` | `members.read` | Get opt-in status for both channels |
| PUT | `/api/members/:id/opt-in` | `members.write` | Update opt-in status |

**GET response and PUT request body:**

```json
{ "email": true, "sms": false }
```

Missing preferences default to opted-in (true). A PUT only needs to include channels being changed.

---

## Message Flow

1. Client calls POST /api/messages with channel, body, and target.
2. The API resolves the target to a list of member IDs with valid contact info for the channel.
3. A Message record is created with status tracking via MessageRecipient rows (one per member).
4. An audit log entry is written immediately.
5. The HTTP response is returned (201) with the Message record and recipient count.
6. Delivery runs asynchronously (fire-and-forget promise) via `processMessageDelivery()`.
7. For each pending recipient, the provider sends the message and the delivery status is updated.

**Variable substitution** is applied to the message body for each recipient:

| Variable | Replaced With |
|---|---|
| `{{firstName}}` | Member first name |
| `{{lastName}}` | Member last name |
| `{{email}}` | Member email address |

Substitution is case-insensitive. Unknown variables are left as-is.

---

## Delivery Status Tracking

Each MessageRecipient row tracks per-recipient status:

| Status | Meaning |
|---|---|
| `pending` | Delivery not yet attempted |
| `sent` | Provider accepted the message |
| `failed` | Delivery failed; errorMessage field contains the reason |

A member who has opted out of a channel is marked as failed with
errorMessage = "Member opted out of this channel".

A member with no contact info for the channel is also marked failed.

---

## Templates

Templates store reusable subject + body pairs for a specific channel.
To compose a message from a template, fetch the template and copy its subject and body into
POST /api/messages. There is no direct template-to-send endpoint; templates are used client-side
as starting content for the compose UI.

The body can include the same merge fields as direct messages (`{{firstName}}`, `{{lastName}}`, `{{email}}`).

---

## Opt-In Management

Opt-in preferences are stored per member per channel in the `OptInPreference` table.
If no preference row exists for a member+channel combination, the member is treated as opted in.

The enforcement happens inside `processMessageDelivery()`:

1. Before attempting delivery, the code checks OptInPreference for the member and channel.
2. If a preference row exists and isOptedIn = false, the recipient is marked failed immediately
   without calling the provider.
3. If no preference row exists, delivery proceeds (default = opted in).

To opt a member out, send:

```http
PUT /api/members/:id/opt-in
```
```json
{ "sms": false }
```

---

## Replacing the Stub Providers

The current providers are stubs that log to the console and simulate a 100ms delay.
They are defined in:

- `backend/src/providers/messaging/email-stub.ts` -- EmailStubProvider
- `backend/src/providers/messaging/sms-stub.ts` -- SmsStubProvider

Both implement the `MessageProvider` interface:

```typescript
interface MessageProvider {
  send(to: string, subject: string | null, body: string): Promise<SendResult>;
}
```

To replace the email stub with SendGrid:

1. Create `backend/src/providers/messaging/sendgrid.ts` implementing `MessageProvider`.
2. In `backend/src/providers/messaging/index.ts`, update `getEmailProvider()` to check
   `process.env.SENDGRID_API_KEY` and return a SendGridProvider instance when it is set.

The same pattern applies for SMS (Twilio etc.): implement `MessageProvider` and update
`getSmsProvider()` in index.ts.

---

## Permission Keys

| Key | Grants |
|---|---|
| `communications.view` | Read messages, templates, and delivery status |
| `communications.send` | Create and dispatch messages; manage templates |

---

## Key Files

| File | Purpose |
|---|---|
| `backend/src/routes/messages.ts` | Message compose, list, recipients, stats |
| `backend/src/routes/message-templates.ts` | Template CRUD |
| `backend/src/routes/opt-in.ts` | Per-member per-channel opt-in read/update |
| `backend/src/providers/messaging/email-stub.ts` | Stub email provider (console logger) |
| `backend/src/providers/messaging/sms-stub.ts` | Stub SMS provider (console logger) |
| `backend/src/providers/messaging/index.ts` | Provider factory and MessageProvider interface |
