# ¡Hola! Spanish practice

Open `index.html` by double-clicking it, or use your browser’s Open File command. Everything is inside this file: no installation, build, account, or internet connection is needed for the quiz.

The GitHub Pages version is at https://martinb35.github.io/hola/. Pages publishes from the root of `master`, so pushing updates to that branch automatically updates the site. `.nojekyll` keeps deployment as plain static HTML. Saved progress belongs to the browser and address: the hosted site and your local file have separate progress.

- Type the translation, then press **Enter** or **Check answer**. Press Enter again or **Next card** after reading the feedback.
- **I don’t know** reveals the answer and counts as incorrect. **Try again** lets you practice that card without changing its first-answer score.
- Accuracy is correct first answers divided by all graded cards. Remaining means cards not yet graded.
- The cartoon thermometer tracks consecutive correct first answers in the current round. Wrong answers or “I don’t know” reset it; practice retries don’t change it. Fireworks celebrate streaks of 5, 10, 15, and 20. Starting a round resets momentum, while reopening the file restores it. On smaller screens the thermometer and fireworks sit above the centered quiz. Reduced-motion settings replace animated fireworks with a still celebration.
- Choose **Everyday Spanish** (the original 24 phrases) or **Personal Information** (17 phrases) under **Study set**. Each set remembers its own round, direction, typed draft, feedback, and streak. Switching back resumes that set. Existing saved progress and scores are preserved automatically.
- At the end, retry missed cards, start a fresh shuffled round, or review every phrase in the selected set. Missed-card rounds have their own scores.
- Use **Practice direction** to switch languages. Changing direction starts a new round. English → Spanish is the initial default.
- **Vocabulary** opens the complete phrase list; **Back to practice** resumes your card. Quiz feedback reveals answers only after submission; the review list is available for studying at any time.
- Progress, the selected direction, and your ten most recent completed scores are saved in this browser. Reopening the same file resumes your round, including feedback and typed text. Browser privacy settings, clearing browser data, or moving the file may remove or separate saved progress. A notice appears if storage is unavailable.
- **Hear Spanish** uses the browser’s speech synthesis. Voice availability and offline audio depend on your browser and installed voices.

On iPhone, open the file in a browser that supports local HTML. Files/Quick Look may only preview it without running JavaScript. If your iPhone won’t open local HTML interactively, serve this unchanged folder on your local network from a computer and open that address in Safari. The layout is designed for phone-sized screens.

Grading ignores accents, case, repeated spaces, periods, commas, question/exclamation marks, inverted punctuation, and ellipses. Straight and curly apostrophes are equivalent. Other spelling differences are incorrect. Both Encantado and Encantada are accepted; the slash in WhatsApp/Instagram is retained as part of that exact phrase.

In Personal Information, **Soy mexicano** and **Soy mexicana** are both accepted. For trailing ellipses, the phrase alone (for example, **Vivo en**) is accepted with or without the dots; adding an ending is optional. Fill underscores with your own words or numbers. Examples: **Nací en Madrid**, **Tengo 13 años**, or **Mi cumpleaños es el 4 de mayo**. This works in both quiz directions. Leading ellipses mark a continuation: **España** or **Soy de España** both work for **...España.** Don’t type literal underscores; unfinished answers such as **Tengo ___ años** are not complete. Grading checks the fixed vocabulary words exactly after normalization, but does not validate the meaning or spelling of your freely supplied personal details. Feedback always shows the original, correctly accented Spanish template. The original set continues accepting its unfinished phrases with or without ellipses, and now also accepts supplied endings.

Developer verification: run `node tests.cjs` (Node is only needed for tests, never for the app).
