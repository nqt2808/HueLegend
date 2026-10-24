# HueLegend product roadmap

This roadmap describes proposed improvements, NOT already implemented features. A change to economic rules or roles must be approved by the project owners before coding.

## P0 - Make existing Sepolia MVP trustworthy (before public pilot)

- Verify deployed contract source, compiler settings, ABI, chain ID, and owner on Sepolia; decide whether to keep the existing contract or deploy a new version.
- Compile and run Solidity/EVM tests in CI; include impersonation, fee limits, reentrancy, stake lock, revocation, role changes, event emission, and refund failures.
- Enforce a batch lifecycle and ordered transitions (created -> collected -> in transit -> retailer -> inspected) with an authorized receiving party.
- Prevent unrelated role holders from writing to other producers' batches without explicit assignment/handoff.
- Decide what happens to stake when active lots remain after 30 days; block unsafe withdrawals if required by policy.
- Guard admin settings against unsafe values (e.g., zero lock duration) and document pause/emergency procedures.
- Make Demo and Sepolia clearly distinguishable in all screens and QR pages; show transactions only after confirmations.

## P1 - Valuable product features

- Producer onboarding/profile: logo, craft village, address, verified business ID, wallet binding and revocation.
- A public trace page for each lot: timeline, each actor, timestamp, document fingerprint, link to Sepolia explorer, and clear unverified/verified/revoked labels.
- Upload evidence/photos/certificates to object storage or IPFS; SHA-256 hash anchored on-chain (never personal data in public metadata).
- Mobile wallet flow using MetaMask SDK / WalletConnect, with explicit mobile-browser testing.
- Public API indexing (events -> database) for search/filter/sort across all batches, not just current page; job to backfill historical events.
- Notifications for pending or reverted transactions and wallet/network changes.

## P2 - Scale and stronger anti-counterfeiting

- Unique per-item serials under a lot; tamper-evident labels or NFC and duplicate-scan alerts (duplicate scans are signals, not proof of fraud).
- Product recall and dispute workflow with auditable on-chain events.
- Operational dashboard for producer/logistics/retailer, exports CSV/PDF and role activity logs.
- Better accessibility, keyboard navigation, loading/skeleton states, E2E mobile tests, monitoring, retries and rate limiting.
- Multilingual public trace page (Vietnamese / English) for tourists.

## Deliberately out of scope until approved

- Automatic stake seizure, whistleblower bounty, tokens, multisig, oracle-based quality claims, fiat payments.
- Claims of government/OCOP certification without verified issuing authorities.

## Suggested first milestone / acceptance criteria

1. A new producer wallet cannot create a lot until the owner grants the role and stake is sufficient.
2. A logistics wallet cannot append a checkpoint to a lot unless that wallet was assigned to the lot and the current stage permits it.
3. A revoked inspector or an unrelated wallet cannot verify; failed calls do not change on-chain state.
4. The lot page reads live state from the correct contract on Sepolia and never substitutes mock records when RPC fails.
5. The same QR opens on desktop/mobile and shows verified vs revoked states accurately.

## Developer-experience follow-ups

- Generate `package-lock.json` with a trusted npm registry and commit it; switch GitHub CI to `npm ci` for reproducible builds.
- Add Solidity compilation and test job to CI after resolving toolchain compatibility; do not advertise contract tests as passing until they run.
- Add an automated secret scan and static analysis on pull requests.
