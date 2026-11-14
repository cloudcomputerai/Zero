# License clarification request to Zero Email Inc.

**Status:** draft, not sent. Send from your own account; keep the reply with this file.

**To:** founders@0.email (listed in the Zero repo as the founders' contact)
**Subject:** License clarification for four files in Mail-0/Zero (MIT repo)

---

Hi Zero team,

I'm building EgorMail (https://egorai.com/egormail), a hosted email client based on a fork of
Mail-0/Zero. Thank you for open-sourcing it.

The repository is licensed under MIT (LICENSE file, and GitHub lists it as MIT). Four files,
however, carry a different header: the Apache License 2.0 notice followed by "Reuse or
distribution of this file requires a license from Zero Email Inc.":

- apps/server/src/routes/agent/index.ts
- apps/server/src/routes/agent/rpc.ts
- apps/server/src/routes/agent/mcp.ts
- apps/server/src/lib/analyze/interests.ts

Since Apache 2.0 itself permits reuse and distribution, and the rest of the repository is MIT,
I want to make sure I'm using these files the way you intend. Could you confirm one of the
following?

1. These files are available under the repository's MIT license (or Apache 2.0), and the extra
   sentence does not apply; or
2. A license from Zero Email Inc. is required, in which case I'd like to discuss terms for using
   them in a hosted, commercial service.

We keep your copyright notices and the MIT license intact, credit Zero on our site and in the
app, and have removed your name, logo and hosted assets from our build.

Thanks,
[Your name]
CloudComputerAI · egorai.com

---

## Why this matters

These files contain the mailbox sync engine (`ZeroDriver`), the AI chat agent (`ZeroAgent`), the
MCP server (`ZeroMCP`), the driver RPC layer and topic generation. They cannot be dropped without
a substantial rewrite. Until there is a written answer:

- Low risk: running EgorMail privately or for testing.
- Get the answer (or legal advice) before: charging customers, or distributing the code
  beyond the existing public fork.
- If they say a license is required and terms don't work, the fallback is a clean-room
  rewrite of those components (multi-week effort).
