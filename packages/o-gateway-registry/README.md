# `@olane/o-gateway-registry`

Public-good gateway registry resolver for `o://` addresses.

> ADR: [`0025-public-good-gateway-registry.md`](https://github.com/olane-labs/o-twin-data-pipeline/blob/staging/docs/adr/0025-public-good-gateway-registry.md)

This package resolves the **first path segment** of an `o://` address — the
gateway namespace — to a libp2p multiaddr by reading a pinned snapshot of
the public-good registry at `github.com/olane-labs/gateway-registry`.

```
o://copass/brendon/shell
   └──┘  ← this segment is what we resolve
```

## Why a registry

Today, `o://` resolves through a single hard-coded gateway (`o://olane` →
`leader.olane.com`). One gateway is a product, not a network. The registry
layer is the substrate that lets multiple operators host slices of the
network — Copass, Anthropic, an enterprise on its own infrastructure, an
indie hacker on a Raspberry Pi — each authoritative for their own users,
all rooted in a common, auditable, mirror-able directory.

Trust comes from the operator's verifiable DID, not from a centralized
authority. Olane Inc. operates `o://olane` as one entry among many; we do
not own the namespace.

## Status: scaffold

This first PR (skeleton) lands:

- `interfaces/registry-entry.ts` — `GatewayRegistryEntry`, `SignatureBlock`
- `interfaces/registry-snapshot.ts` — `RegistrySnapshot`, `SnapshotSignature`
- `interfaces/resolver-config.ts` — `GatewayRegistryResolverConfig`
- `registry/reserved-names.ts` — `RESERVED_GATEWAY_NAMES`, `isReservedGatewayName`, `validateGatewayName`
- Tests for the naming policy

The resolver itself (`GatewayRegistryResolver`) lands in the next PR. The
`did:web` resolver and signature verification land in the PR after.
End-to-end smoke is the final PR in the v0 chain.

See [ADR 0025 §"Phasing"][adr-phasing] for the full sequence and
[ADR 0025 §"Resolution Flow"][adr-flow] for the on-the-wire walkthrough
of `o://copass/brendon/shell` → libp2p stream.

[adr-phasing]: https://github.com/olane-labs/o-twin-data-pipeline/blob/staging/docs/adr/0025-public-good-gateway-registry.md#phasing
[adr-flow]: https://github.com/olane-labs/o-twin-data-pipeline/blob/staging/docs/adr/0025-public-good-gateway-registry.md#resolution-flow--concrete-walk-through

## Naming policy (locked by ADR 0025)

A gateway name is:

- Lowercase ASCII letters, digits, and hyphens
- 2–63 characters (DNS-label compatible — keeps `did:web` upgrades cheap)
- No leading or trailing hyphen
- Not a reserved name

Reserved: `olane`, `localhost`, `local`, `leader`, `lane`, `registry`,
`internal`, and any single-character name.

Use `validateGatewayName(name)` in your registration tooling — it returns
`null` for valid names and a human-readable reason string otherwise.

## Where the work lives

| Artifact | Repo |
|---|---|
| This package (resolver, types) | `olane-labs/olane` (this monorepo) |
| The registry data (signed JSON entries, schema, CODEOWNERS) | `olane-labs/gateway-registry` (separate public repo) |
| The ADR | `olane-labs/o-twin-data-pipeline` (`docs/adr/0025-...`) |
| Operator publication ceremony | PR against `olane-labs/gateway-registry` |
