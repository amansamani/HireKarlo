-- Never silently merge different users/candidate records. Halt for an operator
-- to resolve case-only collisions before applying this canonicalization.
DO $$ BEGIN
  IF EXISTS (SELECT lower(trim(email)) FROM "User" GROUP BY lower(trim(email)) HAVING count(*) > 1)
  OR EXISTS (SELECT "organizationId", lower(trim(email)) FROM "Candidate" GROUP BY "organizationId", lower(trim(email)) HAVING count(*) > 1)
  OR EXISTS (SELECT "organizationId", lower(trim(email)) FROM "TeamInvite" GROUP BY "organizationId", lower(trim(email)) HAVING count(*) > 1)
  THEN RAISE EXCEPTION 'Resolve case-only email collisions before deploying HireKarlo'; END IF;
END $$;
UPDATE "User" SET email = lower(trim(email));
UPDATE "Candidate" SET email = lower(trim(email));
UPDATE "TeamInvite" SET email = lower(trim(email));
