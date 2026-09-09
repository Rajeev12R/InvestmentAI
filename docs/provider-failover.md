# Provider Circuit Breakers & Failover Governance — Phase 10

## 1. Circuit Breaker State Machine
* **CLOSED:** Standard operating state; calls execute against primary provider.
* **OPEN:** Tripped after 5 consecutive failures. Subsequent requests are rejected or routed to registered fallbacks without hitting the failing external endpoint.
* **HALF_OPEN:** After a 30-second cooldown period, tests provider recovery with a threshold of 2 consecutive successful responses before closing the circuit.

## 2. Failover Invariants
* **Compatible Authority:** Failover occurs only between providers with compatible authority tiers. A failed Tier 1 regulatory source is never silently replaced by an unverified Tier 4 source.
* **Audit Logging:** Every failover event records the primary source ID, fallback source ID, failure reason, and timestamp.
