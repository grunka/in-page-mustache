function findInStack(stack, needle) {
    if (needle === ".") {
        return stack[stack.length - 1];
    }
    needle = needle.split(".");
    for (let i = stack.length - 1; i >= 0; i--) {
        let current = stack[i];
        if (current === null || current === undefined) {
            continue;
        }
        for (let j = 0; j < needle.length; j++) {
            if (typeof current !== 'object') {
                break;
            }
            if (!current.hasOwnProperty(needle[j])) {
                break;
            }
            current = current[needle[j]];
            if (j === needle.length - 1) {
                return current;
            }
        }
    }
    return undefined;
}

function findStopTag(template, open, close, needle, index) {
    let currentIndex = index;
    const tagStack = [];
    while (currentIndex < template.length) {
        const openIndex = template.indexOf(open, currentIndex);
        if (openIndex === -1) {
            return undefined;
        }
        const closeIndex = template.indexOf(close, openIndex + open.length);
        if (closeIndex === -1) {
            throw "Could not find close index";
        }
        let tag = template.substring(openIndex + open.length, closeIndex);
        if (tag.startsWith("#") || tag.startsWith("^")) {
            tag = tag.substring(1).trim();
            tagStack.push(tag);
        } else if (tag.startsWith("/")) {
            tag = tag.substring(1).trim();
            if (tagStack.length === 0 && tag === needle) {
                return {
                    stopTagIndex: openIndex,
                    nextCurrentIndex: closeIndex + close.length
                };
            }
            const poppedTag = tagStack.pop();
            if (poppedTag !== tag) {
                throw `Found end tag for ${tag} when expecting ${poppedTag}`;
            }
        }
        currentIndex = closeIndex + close.length;
    }
    return undefined;
}

function renderInternal(template, open, close, partialLookup, escapeHtmlDefault, dataStack) {
    let output = [];
    let currentIndex = 0;
    while (currentIndex < template.length) {
        const openIndex = template.indexOf(open, currentIndex);
        if (openIndex === -1) {
            output.push(template.substring(currentIndex, template.length));
            break;
        }
        const text = template.substring(currentIndex, openIndex);
        if (text.length > 0) {
            output.push(text);
        }
        const closeIndex = template.indexOf(close, openIndex + open.length);
        if (closeIndex === -1) {
            throw `Found open tag at position ${openIndex} but found no close tag`;
        }
        let tag = template.substring(openIndex + open.length, closeIndex).trim();
        currentIndex = closeIndex + close.length;
        if (tag.startsWith("!")) {
            console.debug("Comment", tag.substring(1).trim());
        } else if (tag.startsWith("#") || tag.startsWith("^")) {
            const negated = tag.startsWith("^");
            tag = tag.substring(1).trim();
            const {stopTagIndex, nextCurrentIndex} = findStopTag(template, open, close, tag, currentIndex)
            if (stopTagIndex === -1) {
                throw `Could not find end tag for ${tag}`;
            }
            const nextData = findInStack(dataStack, tag);
            const nextDataIsFalsy = nextData === undefined || nextData === null || nextData === false;
            if (negated && nextDataIsFalsy) {
                if (nextData !== undefined) {
                    dataStack.push(nextData);
                }
                output.push(renderInternal(template.substring(currentIndex, stopTagIndex), open, close, partialLookup, undefined, dataStack))
                if (nextData !== undefined) {
                    dataStack.pop();
                }
            } else if (!negated && !nextDataIsFalsy) {
                if (Array.isArray(nextData)) {
                    let subTemplate = template.substring(currentIndex, stopTagIndex);
                    for (let i = 0; i < nextData.length; i++) {
                        dataStack.push(nextData[i]);
                        output.push(renderInternal(subTemplate, open, close, partialLookup, undefined, dataStack));
                        dataStack.pop();
                    }
                } else if (typeof nextData === "function") {
                    output.push(nextData.call(null, template.substring(currentIndex, stopTagIndex), (text) => {
                        return renderInternal(text, open, close, partialLookup, undefined, dataStack);
                    }));
                } else {
                    dataStack.push(nextData);
                    output.push(renderInternal(template.substring(currentIndex, stopTagIndex), open, close, partialLookup, undefined, dataStack))
                    dataStack.pop();
                }
            }
            currentIndex = nextCurrentIndex;
        } else if (tag.startsWith("/")) {
            tag = tag.substring(1).trim();
            throw `Encountered unexpected end tag ${tag}`;
        } else if (tag.startsWith(">")) {
            tag = tag.substring(1).trim();
            const partialTemplate = partialLookup.call(null, tag);
            output.push(renderInternal(partialTemplate, open, close, partialLookup, undefined, dataStack));
        } else if (tag.startsWith("=") && tag.endsWith("=")) {
            const content = tag.substring(1, tag.length - 1).trim();
            const matchedNewTags = content.match(/^([^ =]+)[ ]+([^ =]+)$/);
            if (!matchedNewTags) {
                throw "Expected new tags but could not find them";
            }
            open = matchedNewTags[1];
            close = matchedNewTags[2];
        } else {
            let escapeHtml = escapeHtmlDefault;
            if (tag.startsWith("&")) {
                escapeHtml = false;
                tag = tag.substring(1).trim();
            } else if (tag.startsWith(open.charAt(0)) && template.charAt(currentIndex) === close.charAt(close.length - 1)) {
                escapeHtml = false;
                tag = tag.substring(1).trim();
                currentIndex++;
            }
            const nextData = findInStack(dataStack, tag);
            if (nextData !== undefined) {
                let result = "" + (typeof nextData === "function" ? nextData.call(null) : nextData);
                if (escapeHtml) {
                    output.push(result
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")
                        .replace(/"/g, "&quot;")
                        .replace(/'/g, "&#039;")
                    );
                } else {
                    output.push(result);
                }
            }
        }
    }
    return output.join("");
}

export default function render(options) {
    if (options === null || options === undefined) {
        throw "No options or template defined";
    }
    let template;
    if (typeof options === "string") {
        template = options;
        options = {};
    } else {
        template = options["template"];
    }
    if (!template) {
        throw "Template not defined";
    }
    const open = options["open"] || "{{";
    const close = options["close"] || "}}";
    const partialLookup = options["partialLookup"] || (name => {
        const partialElement = document.getElementById(name);
        if (!partialElement) {
            throw `Could not find element with id ${name} to use as partial`;
        }
        return partialElement.innerText;
    });
    const dataStack = options["dataStack"] || [options["data"] || {}];
    if (!Array.isArray(dataStack)) {
        throw "Data stack is not a stack";
    }
    const escapeHtmlDefault = options["escapeHtml"] !== false;

    return renderInternal(template, open, close, partialLookup, escapeHtmlDefault, dataStack);
}
