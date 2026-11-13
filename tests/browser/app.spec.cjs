const { test, expect } = require("@playwright/test");
const URL = process.env.HOLA_TEST_URL || "https://martinb35.github.io/hola/";
const KEY = "hola-vocabulary-v1";
const legacyIds = require("../fixtures/legacy-ids.json");
function legacyRound(setId, order) {
  return {
    setId,
    direction: "es",
    order,
    index: 0,
    results: {},
    feedback: null,
    draft: "",
    kind: "missed",
    complete: false,
  };
}
async function open(page, seed) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  if (seed)
    await page.addInitScript(
      ({ key, seed }) => {
        if (!sessionStorage.getItem("seeded")) {
          localStorage.setItem(key, JSON.stringify(seed));
          sessionStorage.setItem("seeded", "yes");
        }
      },
      { key: KEY, seed },
    );
  const response = await page.goto(URL + "?browser-test=" + Date.now());
  expect(response.ok()).toBeTruthy();
  expect(await response.text()).toContain("const SCHEMA_VERSION = 2;");
  await expect(page.locator("#prompt")).not.toBeEmpty();
  return errors;
}
test("Enter, correction, retry, summary, and missed-card round", async ({
  page,
}) => {
  const errors = await open(page, {
    basicAdvanced: 1,
    state: legacyRound("family", [7, 9]),
  });
  await expect(page.locator("#prompt")).toHaveText("Who do you live with?");
  await page.locator("#answer").press("Enter");
  await expect(page.locator("#feedback")).toBeHidden();
  await page.locator("#answer").fill("Con quien vives");
  await page.locator("#answer").press("Enter");
  await expect(page.locator("#feedback")).toContainText("That’s correct");
  await expect(page.locator("#feedback")).toContainText("¿Con quién vives?");
  await page.locator("#submit").press("Enter");
  await expect(page.locator("#prompt")).toHaveText("father");
  await page.locator("#unknown").click();
  await expect(page.locator("#incorrect")).toHaveText("1");
  await page.locator("#retry").click();
  await page.locator("#answer").fill("padre");
  await page.locator("#answer").press("Enter");
  await expect(page.locator("#incorrect")).toHaveText("1");
  await page.locator("#submit").press("Enter");
  await expect(page.locator("#final-percent")).toHaveText("50%");
  await page.locator("#missed").click();
  await expect(page.locator("#prompt")).toHaveText("father");
  await expect(page.locator("#remaining")).toHaveText("1");
  expect(errors).toEqual([]);
});
test("reload migrates legacy progress and keeps draft, feedback, and stable IDs", async ({
  page,
}) => {
  const errors = await open(page, {
    basicAdvanced: 1,
    state: legacyRound("family", [7, 9]),
  });
  await page.locator("#answer").fill("draft to restore");
  await page.reload();
  await expect(page.locator("#answer")).toHaveValue("draft to restore");
  await page.locator("#unknown").click();
  await page.reload();
  await expect(page.locator("#feedback")).toContainText("I don’t know");
  await expect(page.locator("#incorrect")).toHaveText("1");
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    KEY,
  );
  expect(saved.schemaVersion).toBe(2);
  expect(saved.state.order).toEqual([legacyIds.family[7], legacyIds.family[9]]);
  expect(errors).toEqual([]);
});
test("basic and advanced keep separate progress and review remains navigable", async ({
  page,
}) => {
  const errors = await open(page);
  await page.locator("#study-set").selectOption("opinions");
  await expect(page.locator("#remaining")).toHaveText("18");
  await page.locator("#answer").fill("basic draft");
  await page.locator("#advanced").check();
  await expect(page.locator("#remaining")).toHaveText("24");
  await page.locator("#answer").fill("advanced draft");
  await page.locator("#advanced").uncheck();
  await expect(page.locator("#answer")).toHaveValue("basic draft");
  await page.locator("#review-button").click();
  await expect(page.locator("#vocabulary > li")).toHaveCount(18);
  await page.locator("#back").click();
  await page.locator("#advanced").check();
  await expect(page.locator("#answer")).toHaveValue("advanced draft");
  await page.locator("#direction").selectOption("en");
  await expect(page.locator("#answer-label")).toHaveText(
    "Your English translation",
  );
  expect(errors).toEqual([]);
});
test("recovers valid duplicate state without losing the draft", async ({
  page,
}) => {
  const round = { ...legacyRound("family", [7]), draft: "saved family answer" };
  const errors = await open(page, {
    basicAdvanced: 1,
    state: { setId: "family", invalid: true },
    rounds: { family: round },
  });
  await expect(page.locator("#answer")).toHaveValue("saved family answer");
  const backup = await page.evaluate(
    (key) => localStorage.getItem(key + ".recovery"),
    KEY,
  );
  expect(backup).toContain("saved family answer");
  expect(errors).toEqual([]);
});
test("tablet-sized layout keeps touch targets and avoids horizontal overflow", async ({
  page,
}, testInfo) => {
  const errors = await open(page, {
    basicAdvanced: 1,
    state: legacyRound("opinionsAdvanced", [22]),
  });
  const before = await page.locator("#quiz").boundingBox();
  await page.locator("#unknown").click();
  const after = await page.locator("#quiz").boundingBox();
  expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  for (const selector of ["#submit", "#retry", "#review-button"]) {
    const box = await page.locator(selector).boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await page.locator("#review-button").click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("review.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
