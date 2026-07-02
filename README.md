# Italy Trip Portal — Deployable App.

This folder contains your complete, real, deployable web app — converted from
the chat-only version to use a real shared database (Supabase) so multiple
students can register and pick rooms at the same time, safely.

## Files in this folder

- `schema.sql` — run this FIRST in Supabase (creates your database tables)
- `move-student-function.sql` — run this SECOND in Supabase
- `src/` — all the application code
- `package.json`, `vite.config.js`, `index.html` — project configuration

## What to do with this folder

Follow `DEPLOYMENT_GUIDE.md` (provided separately) step by step. In short:
1. Create a Supabase project, run the two .sql files
2. Upload this whole folder to a GitHub repository
3. Connect that repository to Vercel
4. Your app goes live at a real web address

## Known limitation to test for (please test before giving to students)

When an admin **edits room counts** for a hotel that already has students
assigned (e.g. changing a Quad to a Triple), the original chat version
automatically moved the "evicted" student to an unassigned list. In this
converted version, that specific cascade-eviction safety net has NOT yet
been ported — editing room counts after assignments exist may leave a
student's old room_selections row pointing at a room slot that no longer
exists. 

**Practical workaround until this is fixed:** finish each city's room
count configuration BEFORE opening the portal for students, and avoid
editing room counts for a hotel once students have started picking rooms
in it. If you need to change room counts after the fact, manually check
Manual Assignment afterward to confirm no student is showing in a slot
that no longer exists.

Everything else — registration, login, room picking (including concurrent
multi-student picking with database-level conflict protection), manual
assignment, exports, and registration data — is fully converted and ready
to test.
