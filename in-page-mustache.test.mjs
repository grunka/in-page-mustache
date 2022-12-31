#!/usr/bin/env node
import mustache from "./in-page-mustache.js";
import {test} from "node:test";
import {strict as assert} from 'node:assert';

test("No change template", () => assert.strictEqual("Hello World", mustache({template: "Hello World"})));

test("Simple partial", () => assert.strictEqual("Hello World", mustache({
    template: "{{> hello_world }}",
    partialLookup: name => {
        assert.strictEqual("hello_world", name);
        return "Hello World";
    }
})));

test("Should escape html", () => assert.strictEqual("&lt;p&gt;Text&lt;/p&gt;", mustache({
    template: "{{ thing }}",
    data: {
        "thing": "<p>Text</p>"
    }
})));

test("Should not escape html", () => assert.strictEqual("<p>Text</p>", mustache({
    template: "{{{ thing }}}",
    data: {
        "thing": "<p>Text</p>"
    }
})));

test("Should also not escape html", () => assert.strictEqual("<p>Text</p>", mustache({
    template: "{{& thing }}",
    data: {
        "thing": "<p>Text</p>"
    }
})));

test("Should also, also not escape html", () => assert.strictEqual("<p>Text</p>", mustache({
    template: "{{ thing }}",
    escapeHtml: false,
    data: {
        "thing": "<p>Text</p>"
    }
})));

test("Simple deep value lookup", () => assert.strictEqual("Value", mustache({
    template: "{{ thing.one.two }}",
    data: {
        "thing": {
            "one": {
                "two": "Value"
            }
        }
    }
})));

test("Find value in stack above", () => assert.strictEqual("Title One, Title Two, Title Three", mustache({
    template: "{{#one}}{{title}}, {{#two.title}}{{.}},{{/two.title}} {{three}}{{/one}}",
    data: {
        "one": {
            "title": "Title One"
        },
        "two": {
            "title": "Title Two"
        },
        "three": "Title Three"
    }
})));

test("Conditional rendering", () => assert.strictEqual("Value", mustache({
    template: "{{^not_set}}{{^falsy_value}}{{^false_value}}{{#set_value}}{{.}}{{/set_value}}{{/false_value}}{{/falsy_value}}{{/not_set}}",
    data: {
        "falsy_value": null,
        "false_value": false,
        "set_value": "Value"
    }
})));
