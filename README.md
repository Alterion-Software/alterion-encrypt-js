<div align="center">
    <picture>
        <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.png">
        <source media="(prefers-color-scheme: light)" srcset="assets/logo-light.png">
        <img alt="Alterion Logo" src="assets/logo-dark.png" width="400">
    </picture>
</div>

<div align="center">

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/alterion-encrypt.svg)](https://www.npmjs.com/package/alterion-encrypt)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![ESM + CJS](https://img.shields.io/badge/ESM%20%2B%20CJS-dual%20build-green?style=flat)](https://nodejs.org/api/esm.html)
[![GitHub](https://img.shields.io/badge/GitHub-Alterion--Software-181717?style=flat&logo=github&logoColor=white)](https://github.com/Alterion-Software)

_The JavaScript/TypeScript client-side counterpart to [alterion-encrypt](https://github.com/Alterion-Software/alterion-encrypt) — X25519 ECDH key exchange, AES-256-GCM session encryption, and a MessagePack + Deflate request/response pipeline, all in a framework-agnostic package._

---

</div>

## What it does

Each request to the server is packaged as a `Request`:

```
Client → Request { data: AES-256-GCM ciphertext, wrapped_key, client_pk: ephemeral X25519, key_id, ts }
```

**Request path** (`buildRequestPacket`):
1. JSON-serialise the payload and deflate-compress it.
2. Generate a random 32-byte AES-256 `enc_key` per request.
3. AES-256-GCM encrypt the payload with `enc_key`.
4. Generate an ephemeral X25519 key pair, perform ECDH against the server's public key.
5. Derive a `wrap_key` via HKDF-SHA256, use it to AES-GCM wrap `enc_key` → `wrapped_key`.
6. Encode a `Request { data, wrapped_key, client_pk, key_id, ts }` with MessagePack.
7. Store `enc_key` client-side keyed by request ID — it is never sent in plaintext.

**Response path** (`decodeResponsePacket`):
1. MessagePack-decode the `Response { payload, hmac }`.
2. Derive the HMAC key from `enc_key` via HKDF-SHA256 (`"alterion-response-mac"` info label).
3. Constant-time verify the HMAC — reject if invalid.
4. AES-256-GCM decrypt `payload` with `enc_key`.
5. MessagePack-decode → deflate-decompress → JSON-parse → typed result.

No second ECDH round-trip is needed for the response; the server re-uses the `enc_key` it unwrapped from the request. The server side is implemented in [alterion-encrypt](https://github.com/Alterion-Software/alterion-encrypt).

---

## Package layout

```
alterion-encrypt (JS)
├── serializer   buildRequestPacket / decodeResponsePacket — the main public API
├── crypt        aesEncrypt / aesDecrypt — AES-256-GCM with prepended nonce
├── compress     compress / decompress — deflate-raw via CompressionStream
└── keys         deriveWrapKey / deriveResponseMacKey — HKDF-SHA256 key derivation
```

---

## Quick start

### 1. Add the dependency

```bash
npm install alterion-encrypt
```

### 2. Fetch the server's public key

The server exposes a `POST /api/ecdh/init` endpoint (from the `alterion-encrypt` Rust crate) that returns a one-time ephemeral key pair:

```ts
const { handshake_id, public_key } = await fetch("/api/ecdh/init", { method: "POST" })
    .then(r => r.json());

const serverPk = Uint8Array.from(atob(public_key), c => c.charCodeAt(0));
const keyId    = handshake_id;
```

### 3. Encrypt a request

```ts
import { buildRequestPacket } from "alterion-encrypt";

const { wireBytes, encKey } = await buildRequestPacket(
    { username: "alice", action: "login" },
    serverPk,
    keyId,
);

// Store encKey client-side, keyed by request ID, to decrypt the response.
// Send wireBytes as application/octet-stream body.
```

### 4. Decrypt the response

```ts
import { decodeResponsePacket } from "alterion-encrypt";

const rawResponse = await fetch("/api/example", {
    method:  "POST",
    body:    wireBytes,
    headers: { "Content-Type": "application/octet-stream" },
});
const bytes = new Uint8Array(await rawResponse.arrayBuffer());

const result = await decodeResponsePacket<{ token: string }>(bytes, encKey);
console.log(result.token);
```

---

## API

### `buildRequestPacket`

```ts
function buildRequestPacket(
    value:    unknown,
    serverPk: Uint8Array,
    keyId:    string,
): Promise<{ wireBytes: Uint8Array; encKey: Uint8Array }>
```

Encrypts `value` and returns the wire bytes to send and the `enc_key` to hold client-side.

| Parameter | Description |
|---|---|
| `value`    | Any JSON-serialisable payload |
| `serverPk` | Server's 32-byte X25519 public key (base64-decoded from the key endpoint) |
| `keyId`    | Key identifier returned alongside the server's public key |

Returns `{ wireBytes, encKey }`. Store `encKey` indexed by request ID and pass it to `decodeResponsePacket` when the response arrives.

---

### `decodeResponsePacket`

```ts
function decodeResponsePacket<T = unknown>(
    wireBytes: Uint8Array,
    encKey:    Uint8Array,
): Promise<T>
```

Verifies and decodes a server response. Throws if the HMAC is invalid or decryption fails.

| Parameter    | Description |
|---|---|
| `wireBytes`  | Raw bytes from the server response body |
| `encKey`     | The AES key returned by the matching `buildRequestPacket` call |

---

### Lower-level exports

```ts
import { aesEncrypt, aesDecrypt }         from "alterion-encrypt";
import { compress, decompress }            from "alterion-encrypt";
import { deriveWrapKey, deriveResponseMacKey } from "alterion-encrypt";
```

| Function | Description |
|---|---|
| `aesEncrypt(plaintext, key)` | AES-256-GCM encrypt — 12-byte nonce prepended to output |
| `aesDecrypt(data, key)` | AES-256-GCM decrypt — reads nonce from first 12 bytes |
| `compress(data)` | Deflate-raw compress via `CompressionStream` |
| `decompress(data)` | Deflate-raw decompress via `DecompressionStream` |
| `deriveWrapKey(sharedSecret, clientPk, serverPk)` | HKDF-SHA256 wrap key — salt = `clientPk ‖ serverPk`, info = `"alterion-wrap"` |
| `deriveResponseMacKey(encKey)` | HKDF-SHA256 HMAC key — info = `"alterion-response-mac"` |

---

## Pipelines

### Client request (`buildRequestPacket`)

```
Any JSON-serialisable value
        │
        ▼
  JSON.stringify → TextEncoder
        │
        ▼
  deflate-raw compress (CompressionStream)
        │
        ▼
  MessagePack encode  ──→  Uint8Array
        │
        ▼
  AES-256-GCM encrypt  (random enc_key — stored client-side by request ID)
        │
        ▼
  Ephemeral X25519 keygen  ──→  ECDH(client_sk, server_pk)  ──→  HKDF-SHA256  ──→  wrap_key
        │
        ▼
  AES-256-GCM wrap enc_key  (wrap_key)  ──→  wrapped_key
        │
        ▼
  Request { data, wrapped_key, client_pk, key_id, ts }
        │
        ▼
  MessagePack encode  ──→  wire bytes  ──→  sent to server
```

`enc_key` is returned to the caller and must be stored client-side (e.g. keyed by request ID).
`wrapped_key` lets the server recover `enc_key` via ECDH without it ever appearing in plaintext on the wire.

### Server response (`decodeResponsePacket`)

```
wire bytes received from server
        │
        ▼
  MessagePack decode  ──→  Response { payload, hmac }
        │
        ▼
  HKDF-SHA256(enc_key, info="alterion-response-mac")  ──→  mac_key
        │
        ▼
  HMAC-SHA256 verify (mac_key, payload)  ──  reject if invalid
        │
        ▼
  AES-256-GCM decrypt payload  (enc_key)
        │
        ▼
  MessagePack decode  ──→  Uint8Array
        │
        ▼
  deflate-raw decompress (DecompressionStream)
        │
        ▼
  JSON.parse  ──→  T
```

---

## Compatibility

Requires `CompressionStream` / `DecompressionStream` — available in all modern browsers and Node.js 18+.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Open an issue before writing any code.

---

## License

GNU General Public License v3.0 — see [LICENSE](LICENSE).

---

<div align="center">

**Made with ❤️ by the Alterion Software team**

[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?style=flat&logo=discord&logoColor=white)](https://discord.com/invite/3gy9gJyJY8)
[![Website](https://img.shields.io/badge/Website-Coming%20Soon-blue?style=flat&logo=globe&logoColor=white)](.)
[![GitHub](https://img.shields.io/badge/GitHub-Alterion--Software-181717?style=flat&logo=github&logoColor=white)](https://github.com/Alterion-Software)

</div>
