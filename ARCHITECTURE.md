# Maintaining ¡Hola!

The shipped app is still one self-contained index.html. It opens directly in a browser, needs no build, and loads no external JavaScript or CSS. Node packages are development tools only.

## Boundaries inside index.html

- **Vocabulary:** SETS contains named cards: id, display, prompt, accepted answers, hint, template flag, and explicit grading rules. All lesson-specific alternatives live here, not in grade().
- **Grading:** normalize, prepared, matchTemplate, and grade are pure. A leading ellipsis accepts the fragment or only prefixes explicitly listed on that card. Free-form template slots validate fixed words, not the meaning of student-supplied personal details.
- **Round model:** makeRound, answerRound, advanceRound, retryRound, roundCounts, and roundStreak return or inspect values without DOM or storage access.
- **Persistence:** decodeProgress, migrateRound, and encodeProgress are pure. The controller's save() is the local-storage boundary.
- **Views:** render functions update DOM only. Rendering never saves progress. Vocabulary DOM is built only when review is open.
- **Controller:** event handlers use commit() to persist a state transition and then render it. Typing saves the draft without rebuilding the page.

## Adding or editing a lesson

Add named card objects to SETS and an option to the study-set selector. Give every card a unique permanent ID within its lesson. IDs in this version were assigned once from the old wording and an identifying suffix; they must never be regenerated or renumbered when wording or order changes. No grading branch should be needed for a new lesson.

Display text preserves worksheet wording, while prompt holds the quiz wording. Accepted answers are separate from display text. Rules explicitly select exact, template, optional-slots, literal-blanks, or parenthesized-template matching. Add equivalent translations as explicit accepted answers. Do not introduce arbitrary-prefix matching: it can accept negated or unrelated sentences.

## Saved progress

The existing hola-vocabulary-v1 browser key is retained, with schemaVersion 2 in its contents. Round order and result keys now contain permanent card IDs. LEGACY_CARD_IDS is a frozen snapshot translating old numeric positions. Never reorder or regenerate it.

Old Basic/Advanced saves are migrated before validation. Invalid active state recovers the intact corresponding lesson round, then another valid saved round, before starting over. Invalid or unrecognized saved data is copied to the .recovery key before replacement; if that backup cannot be written, save fails without overwriting the original. Do not delete recovery data automatically.

If a saved card no longer exists, its round is invalid rather than silently assigned to a different card. Keep retired cards until a deliberate migration is provided. Completed score history is retained independently of current lesson length.

## Verification

- npm test (or node tests.cjs): dependency-free logic, UI wiring with strict HTML-ID validation, legacy fixtures, score and progress regression checks. Fixtures are historical expectations, not generated from the current catalog during test execution.
- npm install: install development-only tooling from package-lock.json.
- npm run test:browser: Playwright against the published GitHub Pages URL in isolated desktop and tablet-touch browser contexts using installed Microsoft Edge. Set HOLA_TEST_URL to another authorized HTTP(S) deployment to target it. It verifies the v2 source is deployed, not just any page at that address.
- npx prettier --check index.html tests.cjs playwright.config.cjs tests/browser/app.spec.cjs: formatting.

Browser tests cover Enter and native blank validation, feedback, retries, end-of-round scores, missed cards, migration, reload, Basic/Advanced drafts, review navigation, horizontal overflow, stable card width, and touch target sizes. Screenshots and failure traces go to ignored test-results/. Tablet emulation checks Chromium layout and touch capability; it is not a substitute for testing Safari on a physical iPad. Speech synthesis depends on the installed browser voices and remains a manual audio check.
