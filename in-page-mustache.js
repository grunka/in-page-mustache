function findInStack(stack, needle) {
    if (needle === ".") {
        return stack[stack.length - 1];
    }
    const match = stack.findLast(object => typeof object === "object" && object[needle] !== null);
    if (match !== undefined) {
        return match[needle];
    } else {
        return undefined;
    }
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

function renderInternal(template, open, close, dataStack) {
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
                output.push(renderInternal(template.substring(currentIndex, stopTagIndex), open, close, dataStack))
                if (nextData !== undefined) {
                    dataStack.pop();
                }
            } else if (!negated && !nextDataIsFalsy) {
                if (Array.isArray(nextData)) {
                    let subTemplate = template.substring(currentIndex, stopTagIndex);
                    for (let i = 0; i < nextData.length; i++) {
                        dataStack.push(nextData[i]);
                        output.push(renderInternal(subTemplate, open, close, dataStack));
                        dataStack.pop();
                    }
                } else if (typeof nextData === "function") {
                    output.push(nextData.call(null, template.substring(currentIndex, stopTagIndex), (text) => {
                        return renderInternal(text, open, close, dataStack);
                    }));
                } else {
                    dataStack.push(nextData);
                    output.push(renderInternal(template.substring(currentIndex, stopTagIndex), open, close, dataStack))
                    dataStack.pop();
                }
            }
            currentIndex = nextCurrentIndex;
        } else if (tag.startsWith("/")) {
            tag = tag.substring(1).trim();
            throw `Encountered unexpected end tag ${tag}`;
        } else if (tag.startsWith(">")) {
            tag = tag.substring(1).trim();
            const partialElement = document.getElementById(tag);
            if (!partialElement) {
                throw `Could not find element with id ${tag} to use as partial`;
            }
            output.push(renderInternal(partialElement.innerText, open, close, dataStack));
        } else {
            let escapeHtml = true;
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
    let open = options.open || "{{";
    let close = options.close || "}}";

    return renderInternal(template, open, close, [options.data || {}])
}
