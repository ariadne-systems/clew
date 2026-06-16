**Title**
Mint temporary, unbound ids

**Type**: SW

**Description**
In temporary mode, minting a type produces ids of the form `<TYPE>-TMP-<opaque>`, where the opaque part is a crypto-random token.
Minting a count of N yields N temporary ids.
The opaque suffix makes each temporary id unique without any central coordination, so temporary ids generated independently do not collide.

**Rationale**
Preparation happens before approval, sometimes across many drafts over time.
A temporary, opaque handle lets an agent draft and cross-reference artifacts without binding a real, sequential id too early, and without a counter that would clash across independent drafts.

**Verification Description**
Minting type SW with a count of 3 in temporary mode yields three ids of the form `SW-TMP-<opaque>`.
The three opaque suffixes within the call are all distinct.
Each temporary id carries exactly one reserved `-TMP-` marker, which no bound id carries (CON-008), so it is never confused with a bound id.
Cross-call uniqueness follows by construction from the crypto-random token; it is a property of the token, not asserted by drawing random tokens.
