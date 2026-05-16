import { encode, decode } from "@msgpack/msgpack";
import { x25519 } from "@noble/curves/ed25519.js";
import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { randomBytes } from "@noble/hashes/utils.js";

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
}
import { aesEncrypt, aesDecrypt } from "./crypt.js";
import { compress, decompress } from "./compress.js";
import { deriveWrapKey, deriveResponseMacKey } from "./keys.js";

/**
 * Wire-format request packet sent to the server — mirrors the `Request` struct in the Rust crate.
 * @internal For frontend/client-side use only via {@link buildRequestPacket}.
 */
export interface Request {
    data:      Uint8Array;
    kx:        Uint8Array;
    client_pk: Uint8Array;
    key_id:    string;
    ts:        number;
}

/** Encrypted response packet received from the server — mirrors the `Response` struct in the Rust crate. */
export interface Response {
    payload: Uint8Array;
    hmac:    Uint8Array;
}

/** Builds an encrypted request packet ready to send to the server.
 *
 *  Pipeline: `value` → JSON → deflate → msgpack → AES-256-GCM (random `enc_key`) →
 *  ephemeral X25519 ECDH → HKDF wrap key → AES-GCM wrap `enc_key` → `Request` → msgpack.
 *
 *  @param value     Any JSON-serialisable payload.
 *  @param serverPk  Server's 32-byte X25519 public key (from the key endpoint).
 *  @param keyId     Key identifier returned alongside the server's public key.
 *  @returns `{ wireBytes, encKey }` — store `encKey` client-side indexed by request ID and
 *           pass it to {@link decodeResponsePacket} when the server's reply arrives. */
export async function buildRequestPacket(
    value:    unknown,
    serverPk: Uint8Array,
    keyId:    string,
): Promise<{ wireBytes: Uint8Array; encKey: Uint8Array }> {
    const jsonBytes  = new TextEncoder().encode(JSON.stringify(value));
    const compressed = await compress(jsonBytes);
    const msgpacked  = encode(compressed) as Uint8Array;

    const encKey    = randomBytes(32);
    const encrypted = aesEncrypt(msgpacked, encKey);

    const clientSk     = x25519.keygen().secretKey;
    const clientPk     = x25519.getPublicKey(clientSk);
    const sharedSecret = x25519.getSharedSecret(clientSk, serverPk);
    const wrapKey      = deriveWrapKey(sharedSecret, clientPk, serverPk);
    const kx = aesEncrypt(encKey, wrapKey);

    const packet: Request = {
        data:      encrypted,
        kx,
        client_pk: clientPk,
        key_id:    keyId,
        ts:        Math.floor(Date.now() / 1000),
    };

    return { wireBytes: encode(packet) as Uint8Array, encKey };
}

/** Verifies and decodes a server {@link Response} using the `enc_key` returned by
 *  {@link buildRequestPacket}.
 *
 *  Pipeline: msgpack → `Response` → HMAC-SHA256 verify (constant-time) → AES-256-GCM decrypt →
 *  msgpack → deflate decompress → JSON → `T`.
 *
 *  Throws if the HMAC is invalid or decryption fails.
 *
 *  @param wireBytes  Raw bytes received from the server.
 *  @param encKey     The AES session key returned by the matching {@link buildRequestPacket} call.
 *                    **This array is zeroed after use** — do not reference it after calling this function. */
export async function decodeResponsePacket<T = unknown>(
    wireBytes: Uint8Array,
    encKey:    Uint8Array,
): Promise<T> {
    const response = decode(wireBytes) as Response;
    const macKey   = deriveResponseMacKey(encKey);
    const expected = hmac(sha256, macKey, response.payload);

    if (!equalBytes(expected, response.hmac)) {
        throw new Error("Security Alert: Response HMAC verification failed!");
    }

    const decrypted    = aesDecrypt(response.payload, encKey);
    const compressed   = decode(decrypted) as Uint8Array;
    const decompressed = await decompress(compressed);

    macKey.fill(0);
    encKey.fill(0);

    return JSON.parse(new TextDecoder().decode(decompressed)) as T;
}
