# AgentMesh Protocol API

~~~meta
version: 0.1.0
base_url: nats://mesh
auth: nkey
delivery: at_least_once
ordering: unordered
errors: standard
~~~

AgentMesh is an open protocol for agent-to-agent communication over NATS
messaging infrastructure. Agents connect to a shared message bus, register
what they can do, discover each other, exchange requests and responses,
and publish events — all without building point-to-point APIs.

This document describes the complete public interface using the six atomic
primitives that compose into any agent-to-agent workflow.

---

## Global Types

```typescript
type ISO8601 = string;       // format: ISO 8601 datetime, UTC
type UUID = string;          // format: UUID v7
type AgentId = string;       // NKey public key (Ed25519)
type Subject = string;       // dot-delimited NATS subject

type PrimitiveType =
  | "register"
  | "discover"
  | "request"
  | "respond"
  | "emit";

type Availability = "online" | "busy" | "degraded" | "offline";

type IpType = "residential" | "datacenter" | "mobile" | "proxy";

type TaskState =
  | "submitted"
  | "working"
  | "input_required"
  | "auth_required"
  | "completed"
  | "failed"
  | "canceled";

interface TraceContext {
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
}

interface ErrorObject {
  code: string;              // e.g. "SKILL_NOT_FOUND"
  message: string;           // human-readable description
  retryable: boolean;
  retry_after_ms?: number;
  details?: Record<string, unknown>;
}

interface Provider {
  name: string;
  url?: string;
}

interface Skill {
  id: string;                // unique skill identifier
  name: string;              // human-readable name
  description: string;
  tags?: string[];
  input_schema?: Record<string, unknown>;   // JSON Schema
  output_schema?: Record<string, unknown>;  // JSON Schema
  input_modes?: string[];    // accepted MIME types
  output_modes?: string[];   // produced MIME types
  examples?: SkillExample[];
  streaming?: boolean;
  estimated_duration_ms?: number;
}

interface SkillExample {
  input: unknown;
  output: unknown;
}

interface Cost {
  per_request?: number;
  per_token?: number;
  currency: string;          // e.g. "credits", "USD"
  billing_model?: string;
}

interface RateLimits {
  requests_per_second?: number;
  requests_per_minute?: number;
  concurrent_tasks?: number;
}

interface Network {
  ip_type?: IpType;          // self-reported network environment
  geo?: string;              // ISO 3166 code: "US", "US-CA", "DE"
}

interface Trust {
  tenant?: string;           // NATS account public key
  signed_at?: ISO8601;
  signature?: string;        // Ed25519 signature of canonical manifest
}

interface Extension {
  uri: string;
  description?: string;
  required?: boolean;
  version?: string;
}

interface Manifest {
  id: AgentId;               // agent's NKey public key
  name: string;
  description: string;
  version: string;           // semver
  protocol_version: string;  // e.g. "0.1.0"
  provider?: Provider;
  endpoint: Subject;         // typically mesh.agent.{id}.inbox
  availability: Availability;
  last_heartbeat?: ISO8601;
  capabilities: string[];    // broad tags for coarse discovery
  skills: Skill[];           // specific things the agent can do
  accepts?: string[];        // event subjects this agent subscribes to
  emits?: string[];          // event subjects this agent publishes
  cost?: Cost;
  rate_limits?: RateLimits;
  network?: Network;
  trust?: Trust;
  extensions?: Extension[];
  meta?: Record<string, unknown>;
}

interface TextPart {
  text: string;
}

interface DataPart {
  data: Record<string, unknown>;
}

interface RefPart {
  ref: string;               // e.g. "nats://objectstore/bucket/key"
  media_type: string;
  size: number;              // bytes
}

type ArtifactPart = TextPart | DataPart | RefPart;

interface Artifact {
  id: UUID;
  name: string;
  media_type: string;
  parts: ArtifactPart[];
  created_at?: ISO8601;
  meta?: Record<string, unknown>;
}

interface Task {
  id: UUID;
  context_id?: string;       // links related tasks into a session
  requester: AgentId;
  responder: AgentId;
  skill: string;
  state: TaskState;
  created_at: ISO8601;
  updated_at: ISO8601;
  history: Envelope[];
  artifacts: Artifact[];
  meta?: Record<string, unknown>;
}
```

---

## Envelope: AgentMesh Message

~~~meta
id: mesh.envelope
version: 0.1.0
~~~

### Intention

Every message on the mesh — regardless of type — is wrapped in this
envelope. It's the standard wire format that carries identity, correlation,
tracing, and payload. The SDK constructs envelopes automatically, but
understanding the structure is essential for debugging, reading logs, and
understanding what's actually on the wire.

The `type` field determines which capability the `payload` corresponds to.
The `from` field is trustworthy because the NATS transport layer verifies
the sender's cryptographic identity before the message is delivered.

### Schema

```typescript
interface Envelope {
  v: string;                  // protocol version, e.g. "0.1.0"
  id: UUID;                   // unique message ID (auto-generated)
  type: PrimitiveType;        // which primitive this message represents
  ts: ISO8601;                // when the message was created
  from: AgentId;              // sender's agent ID (verified by transport)
  to?: AgentId;               // recipient agent ID (omit for events)
  task_id?: UUID;             // which task this belongs to
  in_reply_to?: UUID;         // ID of the message being replied to
  context_id?: string;        // groups related tasks into a session
  trace: TraceContext;         // distributed tracing context
  payload?: unknown;          // capability-specific content
  artifacts?: Artifact[];     // file attachments or deliverables
  error?: ErrorObject;        // structured error, if something went wrong
  meta?: Record<string, unknown>;
}
```

### Logic Constraints

- The `from` field is trustworthy — the NATS server has already verified the sender's Ed25519 NKey identity
- The `type` field determines which capability schema applies to `payload`
- The `trace` field must always be present — create a new trace for top-level operations, propagate `trace_id` and set `parent_span_id` for downstream calls
- `artifacts` separates deliverables (files, generated content) from conversational messages in `payload`
- `in_reply_to` references the `id` of the message being replied to, not the `task_id`
- `context_id` is optional and groups related tasks into a session for multi-turn interactions

---

## Lifecycle: Task

~~~states
submitted -> working: Agent begins processing the request
working -> completed: Agent finishes successfully [mesh.respond]
working -> failed: Agent encounters an error [mesh.respond]
working -> input_required: Agent needs more info from requester [mesh.respond]
working -> auth_required: Agent needs authorization to proceed [mesh.respond]
input_required -> working: Requester provides the requested input [mesh.request]
auth_required -> working: Requester provides authorization [mesh.request]
submitted -> canceled: Requester cancels before work begins
working -> canceled: Either party cancels the task
input_required -> canceled: Requester cancels instead of providing input
auth_required -> canceled: Requester cancels instead of authorizing
~~~

### Intention

A Task is created when one agent sends a `request` to another. It tracks
a unit of work from submission through completion (or failure). Tasks are
identified by `task_id` and their current state can be checked at any time
via the task update subject.

Use `mesh.request` to create a task. The responding agent progresses the
task by sending `mesh.respond` messages with a `status` field indicating
the new state. Subscribe to `mesh.task.{task_id}.update` to receive state
transitions in real time.

### States

| State | Terminal | Description |
|-------|----------|-------------|
| `submitted` | no | Task received, agent hasn't started yet |
| `working` | no | Agent is actively processing |
| `input_required` | no | Agent needs more information from the requester |
| `auth_required` | no | Agent needs permission or credentials to proceed |
| `completed` | yes | Task finished successfully; result in response payload and/or artifacts |
| `failed` | yes | Task failed; error details in the error field |
| `canceled` | yes | Task was canceled by either party |

### Logic Constraints

- Terminal states (`completed`, `failed`, `canceled`) cannot transition to any other state
- To retry a failed task, create a new task — link them via `context_id` for traceability
- The `task_id` is immutable for the life of the task
- Task state transitions are published to `mesh.task.{task_id}.update` for subscribers

---

## Capability: Register

~~~meta
id: mesh.register
transport: MSG mesh.registry.register (reply)
direction: outbound
auth: required
delivery: at_least_once
~~~

### Intention

Introduces your agent to the mesh. Call this once after connecting to
announce who you are and what you can do. The registry stores your
manifest and makes it discoverable by other agents.

You must register before other agents can find you or send you work. If
you've already registered, calling register again updates your manifest
(e.g., to change availability, add skills, or update network info).

After registration, send heartbeats every 30 seconds to
`mesh.heartbeat.{agent_id}` to remain online. If heartbeats stop, the
registry marks you offline. After extended silence, the registry removes
your manifest entirely.

### Logic Constraints

- The `id` field in the manifest must match your authenticated NKey identity
- Re-registration with the same `id` replaces the existing manifest
- The registry emits a `mesh.event.registry.agent_registered` event on successful registration
- Start heartbeats immediately after registration

### Input

```typescript
// The payload is the full Manifest object
type RegisterRequest = Manifest;
```

### Output

```typescript
interface RegisterResponse {
  status: "ok";
  agent_id: AgentId;
}
```

### Errors

- `INVALID_MANIFEST`: Manifest missing required fields or fails validation
- `IDENTITY_MISMATCH`: Envelope `from` doesn't match manifest `id`

### Example

```json
{
  "v": "0.1.0",
  "id": "msg-001",
  "type": "register",
  "ts": "2026-02-12T10:00:00Z",
  "from": "NAKEYABC123",
  "trace": { "trace_id": "tr-001", "span_id": "sp-001" },
  "payload": {
    "id": "NAKEYABC123",
    "name": "Translator",
    "description": "Translates text between languages",
    "version": "1.0.0",
    "protocol_version": "0.1.0",
    "endpoint": "mesh.agent.NAKEYABC123.inbox",
    "availability": "online",
    "capabilities": ["translation"],
    "skills": [
      {
        "id": "translate",
        "name": "Translate Text",
        "description": "Translates text from one language to another",
        "input_modes": ["text/plain"],
        "output_modes": ["text/plain"]
      }
    ],
    "network": {
      "ip_type": "residential",
      "geo": "US-CA"
    }
  }
}
```

---

## Capability: Discover

~~~meta
id: mesh.discover
transport: MSG mesh.registry.discover (reply)
direction: outbound
auth: required
~~~

### Intention

Searches the registry for agents matching your criteria. Use this to find
agents with specific capabilities, skills, availability, network
environment, or geographic location. This is how your agent finds help —
you describe what you need, and the registry returns who can do it.

All filters combine with AND semantics — every criterion must match. If
you provide no filters, you get all registered agents visible to your
account.

### Logic Constraints

- Results are scoped to your NATS account (tenant) unless cross-tenant discovery is configured
- Capability matching uses subset semantics: an agent with capabilities `["a", "b", "c"]` matches a query for `["a", "b"]`
- The `geo` filter uses case-insensitive prefix matching: `"US"` matches agents in `"US"`, `"US-CA"`, `"US-NY"`, etc.
- Results may be paginated — use `limit` to control page size

### Input

```typescript
interface DiscoverQuery {
  capabilities?: string[];    // agent must have ALL of these
  availability?: Availability;// exact match
  skill_id?: string;          // agent must offer this specific skill
  tags?: string[];            // at least one skill must have a matching tag (OR)
  max_cost?: {
    per_request: number;
    currency: string;
  };
  ip_type?: IpType;           // exact match on network.ip_type
  geo?: string;               // prefix match on network.geo
  version?: string;           // protocol version
  limit?: number;             // max results to return
}
```

### Output

```typescript
interface DiscoverResult {
  agents: Manifest[];         // matching agent manifests
  total: number;              // total matches (may exceed limit)
}
```

### Errors

- `INVALID_QUERY`: Query payload fails validation

### Example

Find online agents that can translate, running on residential networks in the US:

```json
{
  "v": "0.1.0",
  "id": "msg-002",
  "type": "discover",
  "ts": "2026-02-12T10:01:00Z",
  "from": "NAKEYXYZ789",
  "trace": { "trace_id": "tr-002", "span_id": "sp-002" },
  "payload": {
    "capabilities": ["translation"],
    "availability": "online",
    "ip_type": "residential",
    "geo": "US"
  }
}
```

---

## Capability: Request

~~~meta
id: mesh.request
transport: MSG mesh.agent.{agent_id}.inbox (reply)
direction: outbound
auth: required
~~~

### Intention

Asks another agent to do something. This is how agents collaborate — you
discover an agent with the skill you need, then send a request to its
inbox. The request creates a Task and the receiving agent works on it.

You must know the target agent's ID (typically from a prior `discover`
call). The request specifies which skill you want and the input data for
that skill. The agent responds with a `respond` message containing the
result (or an error).

For long-running work, the agent may respond immediately with a
`submitted` or `working` status, then deliver the final result later via
the task update subject. You can also request streaming responses.

### Logic Constraints

- The receiving agent creates a Task upon accepting the request
- If `config.stream` is `true`, the agent delivers incremental results on `mesh.task.{task_id}.stream`
- If `config.timeout_ms` is specified, cancel the request if no response arrives in time
- The request must include a NATS reply subject for synchronous response delivery
- If the skill is not found, the agent responds with `SKILL_NOT_FOUND`

### Input

```typescript
interface RequestPayload {
  skill: string;              // which skill to invoke
  input: unknown;             // skill-specific input data
  config?: {
    timeout_ms?: number;      // caller's timeout
    stream?: boolean;         // request streaming response
    accepted_output?: string[];// MIME types the caller accepts
  };
}
```

### Output

```typescript
// The response is a RespondPayload (see mesh.respond)
interface RespondPayload {
  status: TaskState;
  message?: string;
  output?: unknown;
}
```

### Errors

- `AGENT_UNAVAILABLE`: Agent is offline or not accepting requests
- `SKILL_NOT_FOUND`: Agent doesn't have the requested skill
- `INPUT_INVALID`: Input doesn't match the skill's expected schema
- `UNAUTHORIZED`: Requesting agent lacks permission to invoke this skill
- `CONTENT_TYPE_NOT_SUPPORTED`: Requested output modes aren't supported
- `AGENT_OVERLOADED`: Agent is too busy to accept work right now
- `COST_LIMIT_EXCEEDED`: Request would exceed the caller's cost budget

### Example

Ask the Translator agent to translate text:

```json
{
  "v": "0.1.0",
  "id": "msg-003",
  "type": "request",
  "ts": "2026-02-12T10:02:00Z",
  "from": "NAKEYXYZ789",
  "to": "NAKEYABC123",
  "trace": { "trace_id": "tr-003", "span_id": "sp-003" },
  "payload": {
    "skill": "translate",
    "input": {
      "text": "Hello, how are you?",
      "source_lang": "en",
      "target_lang": "fr"
    },
    "config": {
      "timeout_ms": 30000
    }
  }
}
```

---

## Capability: Respond

~~~meta
id: mesh.respond
transport: MSG mesh.task.{task_id}.update
direction: outbound
auth: required
~~~

### Intention

Sends a response back to the agent that made a request. This is how you
deliver results. The response progresses or completes the Task — the
`status` field indicates the new task state.

For simple request/response, the initial reply goes back on the NATS
reply subject (synchronous). For long-running tasks, send updates to
`mesh.task.{task_id}.update` so the requester (and any other subscribers)
can track progress.

Use `payload.output` for the skill result. Use `artifacts` for
deliverables like files or large generated content. Messages are
communication; artifacts are deliverables.

### Logic Constraints

- Must reference the original request via `in_reply_to`
- Must include a `task_id` linking to the Task lifecycle
- A response with `status: "completed"` is terminal — no further responses expected
- A response with `status: "input_required"` means you need more info — the requester should send a follow-up `request` with the same `task_id` and `context_id`
- Use `artifacts` for large results; do not put large data in `payload.output`

### Input

```typescript
interface RespondPayload {
  status: TaskState;          // the new task state
  message?: string;           // optional human-readable status
  output?: unknown;           // skill-specific result data
}
```

### Errors

- `TASK_NOT_FOUND`: No task with this `task_id` exists
- `TASK_INVALID_TRANSITION`: Illegal state change (e.g., `completed` → `working`)

### Example

Successful translation response:

```json
{
  "v": "0.1.0",
  "id": "msg-004",
  "type": "respond",
  "ts": "2026-02-12T10:02:01Z",
  "from": "NAKEYABC123",
  "to": "NAKEYXYZ789",
  "in_reply_to": "msg-003",
  "task_id": "task-001",
  "trace": { "trace_id": "tr-003", "span_id": "sp-004", "parent_span_id": "sp-003" },
  "payload": {
    "status": "completed",
    "output": {
      "text": "Bonjour, comment allez-vous?",
      "source_lang": "en",
      "target_lang": "fr"
    }
  }
}
```

---

## Capability: Emit

~~~meta
id: mesh.emit
transport: MSG mesh.event.{domain}.{event_type}
direction: outbound
auth: required
delivery: at_least_once
~~~

### Intention

Publishes an event to the mesh. Events are fire-and-forget — you don't
know who's listening, and you don't get a response. Only agents that have
subscribed to the matching topic will receive the event.

Use events for things that happen that other agents might care about, but
where you don't need a direct response: data was scraped, a user logged
in, a task completed, a threshold was crossed.

The subject is `mesh.event.{domain}.{event_type}` — for example,
`mesh.event.scraping.profile_found` or `mesh.event.user.login`. Choose
domains and event types that are meaningful to your use case.

### Logic Constraints

- Events are delivered to all subscribers matching the subject pattern
- No reply is expected or delivered
- Events are persisted via JetStream for durable subscribers
- The `domain` and `event_type` fields in the payload should match the subject tokens

### Input

```typescript
interface EmitPayload {
  domain: string;             // e.g. "scraping", "user", "system"
  event_type: string;         // e.g. "profile_found", "login"
  data: unknown;              // event-specific payload
}
```

### Example

Publishing a scraping result event:

```json
{
  "v": "0.1.0",
  "id": "msg-005",
  "type": "emit",
  "ts": "2026-02-12T10:05:00Z",
  "from": "NAKEYSCRAPER",
  "trace": { "trace_id": "tr-005", "span_id": "sp-005" },
  "payload": {
    "domain": "scraping",
    "event_type": "profile_found",
    "data": {
      "url": "https://example.com/profile/jane",
      "name": "Jane Doe",
      "title": "Senior Engineer"
    }
  }
}
```

---

## Subscription: Mesh Events

~~~meta
id: mesh.subscribe
transport: SUB mesh.event.{topic}
delivery: at_least_once
~~~

### Intention

Listens for events published by other agents on the mesh. Subscribe to a
specific topic like `mesh.event.scraping.profile_found`, or use wildcards
to catch broader patterns.

Use this for reacting to things that happen on the mesh without polling.
Events arrive as long as your subscription is active.

### Logic Constraints

- Wildcard `*` matches exactly one token: `mesh.event.scraping.*` matches `mesh.event.scraping.profile_found` but not `mesh.event.scraping.linkedin.profile_found`
- Wildcard `>` matches one or more tokens and must appear at the end: `mesh.event.>` matches all events
- Subscriptions are active for the duration of the agent's connection
- An agent can hold multiple concurrent subscriptions to different patterns
- Events are persisted via JetStream — late-joining subscribers can replay

### Output

```typescript
// Events arrive wrapped in the standard Envelope.
// The payload is an EmitPayload:
interface EmitPayload {
  domain: string;
  event_type: string;
  data: unknown;
}
```

### Example

Subscribing to `mesh.event.scraping.>` delivers all scraping events:

```json
{
  "v": "0.1.0",
  "id": "msg-006",
  "type": "emit",
  "ts": "2026-02-12T10:05:00Z",
  "from": "NAKEYSCRAPER",
  "trace": { "trace_id": "tr-005", "span_id": "sp-005" },
  "payload": {
    "domain": "scraping",
    "event_type": "profile_found",
    "data": {
      "url": "https://example.com/profile/jane",
      "name": "Jane Doe"
    }
  }
}
```

---

## Subscription: Task Updates

~~~meta
id: mesh.task.updates
transport: SUB mesh.task.{task_id}.update
delivery: at_least_once
ordering: ordered
~~~

### Intention

Subscribes to state changes for a specific task. After sending a
`request`, subscribe to this subject to receive real-time updates as the
task progresses through its lifecycle (submitted → working → completed,
etc.).

This is especially useful for long-running tasks where the initial
response may just be `"status": "working"` and the final result arrives
later.

### Logic Constraints

- Updates arrive in order for a given task
- Each update is a `respond` envelope with the current task state
- Terminal states (`completed`, `failed`, `canceled`) are the last update

### Output

```typescript
// Updates arrive as standard Envelopes with type "respond"
// and a RespondPayload:
interface RespondPayload {
  status: TaskState;
  message?: string;
  output?: unknown;
}
```

---

## Capability: Handle Incoming Request

~~~meta
id: mesh.agent.inbox
transport: MSG mesh.agent.{agent_id}.inbox
direction: inbound
auth: required
~~~

### Intention

This is your agent's inbox — the subject where other agents send you
work. When another agent discovers you and wants to use one of your
skills, their request arrives here.

You must implement a handler that:

1. Reads the requested `skill` from the payload
2. Routes to the appropriate skill handler in your agent
3. Sends back a `respond` envelope with the result (or an error)

This is the core of what makes your agent useful on the mesh. If you
don't handle inbox messages, other agents can discover you but can't
interact with you.

### Logic Constraints

- Create a Task when you accept a request
- If the requested skill doesn't exist, respond with `SKILL_NOT_FOUND`
- If you're too busy, respond with `AGENT_OVERLOADED`
- For long-running work, respond immediately with `status: "working"` and deliver the final result via `mesh.task.{task_id}.update`
- Propagate the caller's trace context — set `parent_span_id` to the caller's `span_id`

### Input

```typescript
// Incoming requests have a RequestPayload:
interface RequestPayload {
  skill: string;
  input: unknown;
  config?: {
    timeout_ms?: number;
    stream?: boolean;
    accepted_output?: string[];
  };
}
```

### Output

```typescript
// Your handler returns a RespondPayload:
interface RespondPayload {
  status: TaskState;
  message?: string;
  output?: unknown;
}
```

### Errors

- `SKILL_NOT_FOUND` (retryable: no): You don't have the requested skill
- `AGENT_OVERLOADED` (retryable: yes): You're too busy to accept work
- `INPUT_INVALID` (retryable: no): The input doesn't match your skill's schema
- `INTERNAL_ERROR` (retryable: yes): Something went wrong in your handler

### Example

Incoming request for the "translate" skill:

```json
{
  "v": "0.1.0",
  "id": "msg-010",
  "type": "request",
  "ts": "2026-02-12T11:00:00Z",
  "from": "NAKEYXYZ789",
  "to": "NAKEYABC123",
  "trace": { "trace_id": "tr-010", "span_id": "sp-010" },
  "payload": {
    "skill": "translate",
    "input": { "text": "Hello", "target_lang": "fr" }
  }
}
```

Your handler responds:

```json
{
  "v": "0.1.0",
  "id": "msg-011",
  "type": "respond",
  "ts": "2026-02-12T11:00:01Z",
  "from": "NAKEYABC123",
  "to": "NAKEYXYZ789",
  "in_reply_to": "msg-010",
  "task_id": "task-010",
  "trace": { "trace_id": "tr-010", "span_id": "sp-011", "parent_span_id": "sp-010" },
  "payload": {
    "status": "completed",
    "output": { "text": "Bonjour" }
  }
}
```

---

## Error Codes

| Code | Retryable | Description |
|------|-----------|-------------|
| `TRANSPORT_TIMEOUT` | yes | Request timed out waiting for a reply |
| `TRANSPORT_NO_RESPONDERS` | no | Nobody is listening on that subject |
| `TRANSPORT_PERMISSION_DENIED` | no | NATS account permissions deny this operation |
| `INVALID_ENVELOPE` | no | Message couldn't be decoded |
| `INVALID_VERSION` | no | Protocol version not supported |
| `IDENTITY_MISMATCH` | no | Envelope `from` doesn't match authenticated identity |
| `INVALID_MANIFEST` | no | Manifest missing required fields |
| `INVALID_QUERY` | no | Discovery query fails validation |
| `TASK_NOT_FOUND` | no | No task with this ID exists |
| `TASK_INVALID_TRANSITION` | no | Illegal state change (e.g., `completed` → `working`) |
| `TASK_NOT_CANCELABLE` | no | Task is already in a terminal state |
| `TASK_EXPIRED` | no | Task TTL has elapsed |
| `AGENT_UNAVAILABLE` | yes | Agent is offline or unreachable |
| `AGENT_OVERLOADED` | yes | Agent is too busy to accept work |
| `SKILL_NOT_FOUND` | no | Agent doesn't have the requested skill |
| `INPUT_INVALID` | no | Input doesn't match the skill's schema |
| `CONTENT_TYPE_NOT_SUPPORTED` | no | Requested output modes aren't supported |
| `UNAUTHORIZED` | no | Agent lacks permission for this operation |
| `COST_LIMIT_EXCEEDED` | no | Request would exceed cost budget |
| `INTERNAL_ERROR` | yes | Something went wrong inside the agent |
| `DEPENDENCY_FAILED` | yes | A downstream dependency failed |
| `CONTEXT_TOO_LARGE` | no | Input exceeds context size limits |
| `RATE_LIMITED` | yes | Too many requests — slow down |

When `retryable` is `true`, use exponential backoff starting at 100ms,
doubling each time, capped at 10 seconds. For `TRANSPORT_TIMEOUT` and
`AGENT_UNAVAILABLE`, the agent may come back online. For
`AGENT_OVERLOADED` and `RATE_LIMITED`, you're being asked to slow down.
If the error includes `retry_after_ms`, use that value instead.

---

## Subject Namespace

| Subject | Purpose | Transport |
|---------|---------|-----------|
| `mesh.registry.register` | Agent registration | MSG (reply) |
| `mesh.registry.deregister` | Agent deregistration | MSG |
| `mesh.registry.discover` | Discovery queries | MSG (reply) |
| `mesh.registry.get.{agent_id}` | Manifest lookup | MSG (reply) |
| `mesh.agent.{agent_id}.inbox` | Direct requests to an agent | MSG (reply) |
| `mesh.task.{task_id}.update` | Task state changes | SUB |
| `mesh.task.{task_id}.stream` | Streaming responses | SUB |
| `mesh.event.{domain}.{event_type}` | Domain events (pub/sub) | SUB |
| `mesh.heartbeat.{agent_id}` | Agent liveness signals | MSG |
| `mesh.session.{context_id}.>` | Session messages | MSG |

Wildcard rules:
- `*` matches exactly one token: `mesh.event.scraping.*` matches `mesh.event.scraping.profile_found`
- `>` matches one or more tokens (must be at end): `mesh.event.>` matches all events
