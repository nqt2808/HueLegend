# Security policy

HueLegend is an educational MVP, not audited production infrastructure.

- DO NOT use mainnet ETH or assume Sepolia deployment and bytecode are verified.
- Never commit a seed phrase, private key, admin token, wallet backup, or paid RPC credential.
- Client-side role labels do not authorize transactions; Solidity must enforce permissions.
- Smart contract changes require EVM tests and independent review before deployment.
- Metadata URLs, hashes, timestamps, and QR codes do not prove real-world origin by themselves.
- If a vulnerability is discovered, avoid publicly publishing exploit details until maintainers can review them. Contact the repository owners through a private channel.

## Current security review gaps

1. A role-authorized actor can add checkpoints to any existing batch; there is no per-batch handoff authorization or enforced order.
2. Stakes can become withdrawable after the time lock without a check for outstanding active lots.
3. `setStakeLockDuration` currently accepts zero; evaluate safe lower and upper bounds.
4. Public read APIs need production rate limits, RPC monitoring, and indexing for larger datasets.
5. QR codes can be copied onto counterfeit packages; stronger physical binding is needed.

Do not treat this list as a complete security audit.
