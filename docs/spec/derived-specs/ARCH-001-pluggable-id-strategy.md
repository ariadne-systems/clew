**Title**
Id generation is a config-selected, pluggable strategy

**Lens**: ARCH

**Description**
The scheme that generates an id's variable part is chosen by configuration and implemented behind a strategy interface.
Sequential and opaque are two such strategies.
The minting code depends on the strategy interface, never on a concrete strategy.

**Rationale**
A solo repository suits a readable sequence; parallel multi-developer work suits collision-free opaque suffixes.
Selecting by configuration, behind an interface, keeps the choice open and the cost of a new scheme down to one implementation.

**Verification Description**
With sequential configured, minting yields sequential ids.
Switching the configuration to opaque (once implemented) changes only the suffix scheme, with no change to the minting code.
The minting code references no concrete strategy.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)
