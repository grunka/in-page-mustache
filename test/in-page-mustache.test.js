#!/usr/bin/env node
import mustache from "../in-page-mustache.js";
import {assertEquals,fail} from "./asserts.js";

assertEquals("Hello World", mustache({template: "Hello World"}));

assertEquals("Hello World", mustache({
    template: "{{> hello_world }}",
    partialLookup: name => {
        assertEquals("hello_world", name);
        return "Hello World";
    }
}));
