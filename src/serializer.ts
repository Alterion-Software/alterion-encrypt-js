import { encode, decode } from "@msgpack/msgpack";
import { x25519 } from "@noble/curves/ed25519.js";
import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { randomBytes } from "@noble/hashes/utils.js";
import { aesEncrypt, aesDecrypt } from "./crypt.js";
import { compress, decompress } from "./compress.js";
import { deriveWrapKey, deriveResponseMacKey } from "./keys.js";

/** Outgoing encrypted request packet — mirrors the `Request` struct in the Rust crate. */
export interface Request {
    data:        Uint8Array;
    /** Client's randomly-generated AES-256 key, AES-GCM wrapped with the ECDH-derived wrap key. */
    wrapped_key: Uint8Array;
    /** Client's ephemeral X25519 public key (32 bytes). */
    client_pk:   Uint8Array;
    key_id:      string;
    /** Unix timestamp (seconds). Validated server-side within ±30 seconds. */
    ts:          number;
}

/** Encrypted response packet — mirrors the `Response` struct in the Rust crate. */
export interface Response {
    /** AES-256-GCM ciphertext (nonce prepended). */
    payload: Uint8Array;
    /** HMAC-SHA256 over `payload`, keyed with the mac key derived from `enc_key`. */
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
    const wrappedKey   = aesEncrypt(encKey, wrapKey);

    const packet: Request = {
        data:        encrypted,
        wrapped_key: wrappedKey,
        client_pk:   clientPk,
        key_id:      keyId,
        ts:          Math.floor(Date.now() / 1000),
    };

    return { wireBytes: encode(packet) as Uint8Array, encKey };
}

/** Verifies and decodes a server {@link Response} using the `enc_key` returned by
 *  {@link buildRequestPacket}.
 *
 *  Pipeline: msgpack → `Response` → HMAC-SHA256 verify → AES-256-GCM decrypt →
 *  msgpack → deflate decompress → JSON → `T`.
 *
 *  Throws if the HMAC is invalid or decryption fails.
 *
 *  @param wireBytes  Raw bytes received from the server.
 *  @param encKey     The AES key returned by the matching {@link buildRequestPacket} call. */
export async function decodeResponsePacket<T = unknown>(
    wireBytes: Uint8Array,
    encKey:    Uint8Array,
): Promise<T> {
    const response = decode(wireBytes) as Response;
    const macKey   = deriveResponseMacKey(encKey);
    const expected = hmac(sha256, macKey, response.payload);

    let isValid = expected.length === response.hmac.length;
    for (let i = 0; i < expected.length; i++) {
        if (expected[i] !== response.hmac[i]) isValid = false;
    }
    if (!isValid) throw new Error("Response HMAC verification failed");

    const decrypted    = aesDecrypt(response.payload, encKey);
    const compressed   = decode(decrypted) as Uint8Array;
    const decompressed = await decompress(compressed);
    return JSON.parse(new TextDecoder().decode(decompressed)) as T;
}
