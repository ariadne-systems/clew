**Title**
The numeric padding is configured in `.ariadnerc.json`

**Type**: CON

**Description**
The width to which sequential numbers are zero-padded is read from `.ariadnerc.json`.
It is not hard-coded.
A configured width of 3 renders the number 7 as `007`.

**Rationale**
Projects differ in expected id volume and house style.
The padding belongs in the project's configuration so that ids are consistent and chosen deliberately.

**Verification Description**
With a configured width of 3, the number 7 renders as `007`.
Changing the configured width changes the rendering accordingly.
No padding width is hard-coded in the minting code.
