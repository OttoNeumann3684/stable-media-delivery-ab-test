import assert from "node:assert/strict";
import { chooseStreamVariant } from "./media_delivery.ts";

assert.equal(chooseStreamVariant("media-processing-v2"), "media-processing-v2");
assert.equal(chooseStreamVariant("control"), "control");
assert.equal(chooseStreamVariant({ value: "control" }), "control");
console.log("media delivery assignment test passed");
