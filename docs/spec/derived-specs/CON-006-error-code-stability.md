**Title**
An error code is stable: never reused or renamed once released

**Lens**: CON

**Description**
Once an error code has been released it is never reused for a different condition and never renamed.
The set of codes grows additively; a code that is retired is deprecated, not repurposed or removed.
A consumer that branches on a code can rely on its meaning across versions.

**Rationale**
The value of a code is that it is a durable contract for automation, support, and documentation.
Reusing or renaming a code silently changes the meaning consumers depend on — the same hazard a reused id poses to traceability.
Stability is what makes a code worth depending on.

**Verification Description**
A released code keeps its meaning across versions; a change of meaning requires a new code.
Renaming or repurposing a released code is treated as a breaking change.
The documented set of codes only grows.
