**Title**
Ids are returned only after the allocation is persisted

**Lens**: CON

**Description**
A mint returns ids only after the advanced high-water mark has been durably saved.
If the state cannot be saved, the mint fails with an error, returns no ids, and leaves the persisted high-water mark unchanged.
The numbers a failed mint would have used are therefore allocated on the next attempt; because the failed mint issued nothing, they are never handed out twice.

**Rationale**
Returning ids without persisting the advance would let the next mint reissue the same numbers, breaking the never-reused guarantee and drifting the sequence.
Persisting before returning trades a possible gap — if the process dies after a successful save but before the ids are used — for the stronger property that no number is ever reused.
A gap is harmless; reuse is not.

**Verification Description**
When the save fails, the mint raises an error, returns no ids, and the persisted high-water mark is unchanged.
After a successful mint, the returned ids correspond exactly to the advance recorded in the persisted state.

## Relations

**Concerns**

- [ENT-001 — AriadneState](../domain-model.md#ent-001-ariadnestate)
