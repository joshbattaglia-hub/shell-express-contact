import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseManagerEmails,
  formatManagerEmails,
  recipientsFromSite,
  normalizeSiteRecord,
} from "../recipients.mjs";

describe("parseManagerEmails", () => {
  it("parses comma-separated addresses", () => {
    const r = parseManagerEmails("a@x.com, b@y.com");
    assert.equal(r.ok, true);
    assert.deepEqual(r.emails, ["a@x.com", "b@y.com"]);
  });

  it("accepts semicolons and trims", () => {
    const r = parseManagerEmails(" a@x.com ; B@Y.com ");
    assert.equal(r.ok, true);
    assert.deepEqual(r.emails, ["a@x.com", "b@y.com"]);
  });

  it("dedupes case-insensitively", () => {
    const r = parseManagerEmails("a@x.com, A@X.com");
    assert.equal(r.ok, true);
    assert.deepEqual(r.emails, ["a@x.com"]);
  });

  it("rejects invalid entries", () => {
    const r = parseManagerEmails("a@x.com, not-an-email");
    assert.equal(r.ok, false);
    assert.match(r.error, /Invalid email/);
  });

  it("requires at least one", () => {
    const r = parseManagerEmails("  ,  ");
    assert.equal(r.ok, false);
  });

  it("accepts a single legacy string", () => {
    const r = parseManagerEmails("solo@x.com");
    assert.equal(r.ok, true);
    assert.deepEqual(r.emails, ["solo@x.com"]);
  });
});

describe("recipientsFromSite", () => {
  it("builds Resend to[] from managerEmails array", () => {
    assert.deepEqual(
      recipientsFromSite({ managerEmails: ["a@x.com", "b@y.com"] }),
      ["a@x.com", "b@y.com"]
    );
  });

  it("falls back to legacy managerEmail string", () => {
    assert.deepEqual(
      recipientsFromSite({ managerEmail: "a@x.com, b@y.com" }),
      ["a@x.com", "b@y.com"]
    );
  });

  it("returns [] when missing", () => {
    assert.deepEqual(recipientsFromSite({}), []);
    assert.deepEqual(recipientsFromSite(null), []);
  });
});

describe("normalizeSiteRecord", () => {
  it("maps manager alias to managerName", () => {
    const s = normalizeSiteRecord({
      name: "Shell Express Moe",
      manager: "Puneet Verma",
      managerEmail: "pverma@libertyretail.com.au",
    });
    assert.equal(s.managerName, "Puneet Verma");
    assert.equal(s.managerEmail, "pverma@libertyretail.com.au");
    assert.deepEqual(s.managerEmails, ["pverma@libertyretail.com.au"]);
  });

  it("formats multiple emails as comma string", () => {
    const s = normalizeSiteRecord({
      managerName: "Team",
      managerEmail: "a@x.com,b@y.com",
    });
    assert.equal(s.managerEmail, "a@x.com, b@y.com");
    assert.deepEqual(s.managerEmails, ["a@x.com", "b@y.com"]);
  });

  it("formatManagerEmails joins arrays", () => {
    assert.equal(formatManagerEmails(["a@x.com", "b@y.com"]), "a@x.com, b@y.com");
  });
});

import { buildEnquiryEmail } from "../email.mjs";

describe("buildEnquiryEmail recipients", () => {
  it("sets to as an array of all manager emails", () => {
    const mail = buildEnquiryEmail({
      enquiry: {
        reference: "SE-CA-TEST",
        values: { enquiry_type: "Feedback", name: "T", email: "t@x.com", message: "hi" },
        createdAt: "2026-01-01",
        status: "new",
      },
      site: {
        name: "Shell Express Moe",
        managerEmail: "a@x.com, b@y.com",
        managerEmails: ["a@x.com", "b@y.com"],
      },
      settings: { fromName: "Shell Express Contact", emailEnabled: false },
    });
    assert.deepEqual(mail.to, ["a@x.com", "b@y.com"]);
  });
});
