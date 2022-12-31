#!/usr/bin/env node
import mustache from "./in-page-mustache.js";
import test from "node:test";
import { strict as assert } from 'node:assert';

test("No change template", () => assert.strictEqual("Hello World", mustache({template: "Hello World"})));

test("Simple partial", () => assert.strictEqual("Hello World", mustache({
    template: "{{> hello_world }}",
    partialLookup: name => {
        assert.strictEqual("hello_world", name);
        return "Hello World";
    }
})));
