import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SURVEY_COCO, migrateCocoSurvey, SURVEY_COCO_REVISION } from "../store.mjs";

describe("CoCo survey heading", () => {
  it("does not ship the removed step-1 heading in the default survey", () => {
    assert.equal(DEFAULT_SURVEY_COCO.revision, SURVEY_COCO_REVISION);
    assert.equal(DEFAULT_SURVEY_COCO.title, "");
    assert.equal(DEFAULT_SURVEY_COCO.steps[0].title, "");
    assert.equal(DEFAULT_SURVEY_COCO.steps[1].title, "");
    assert.equal(DEFAULT_SURVEY_COCO.steps[0].questions[0].label, "What is your feedback in relation to?");
    const blob = JSON.stringify(DEFAULT_SURVEY_COCO);
    assert.equal(blob.includes("How did we do today?"), false);
  });

  it("drops the leftover heading when migrating a stored revision 3 survey", () => {
    const migrated = migrateCocoSurvey({
      title: "How did we do today?",
      revision: 3,
      sitePickerEnabled: false,
      phoneNumber: "0400111222",
      contactEmail: "desk@example.com",
      steps: [
        {
          id: "step2",
          title: "How did we do today?",
          questions: [
            {
              id: "feedback_topic",
              label: "What is your feedback in relation to?",
              type: "single",
              options: ["Need a printed receipt", "Anything else"],
            },
          ],
        },
        {
          id: "contact",
          title: "How did we do today?",
          kind: "message",
          message: "Call {{phone}}",
        },
      ],
    });

    assert.equal(migrated.revision, 4);
    assert.equal(migrated.title, "");
    assert.equal(migrated.steps[0].title, "");
    assert.equal(migrated.steps[1].title, "");
    assert.deepEqual(migrated.steps[0].questions[0].options, ["Need a printed receipt", "Anything else"]);
    assert.equal(migrated.steps[1].message, "Call {{phone}}");
    assert.equal(migrated.phoneNumber, "0400111222");
    assert.equal(migrated.contactEmail, "desk@example.com");
    assert.equal(JSON.stringify(migrated).includes("How did we do today?"), false);
  });

  it("keeps a custom heading that is not the removed step-1 title", () => {
    const migrated = migrateCocoSurvey({
      title: "Your feedback",
      revision: 2,
      steps: [
        { id: "step2", title: "Tell us more", questions: [{ id: "feedback_topic", label: "Topic?", options: ["A"] }] },
        { id: "contact", title: "We'll be in touch", kind: "message", message: "Thanks" },
      ],
    });
    assert.equal(migrated.title, "Your feedback");
    assert.equal(migrated.steps[0].title, "Tell us more");
    assert.equal(migrated.steps[1].title, "We'll be in touch");
  });
});
