(() => {
    function parse(template, options) {
        options = options || {
            open: '{{',
            close: '}}'
        };

        const stack = [];
        let currentRenderer = {
            name: null,
            negated: false,
            startIndex: 0,
            endIndex: template.length,
            items: []
        };

        const getMatchingFromStack = (stack, needle) => {
            const match = stack.findLast(object => typeof object === 'object' && object[needle] !== null);
            if (match !== undefined) {
                return match[needle];
            } else {
                return undefined;
            }
        };

        let currentIndex = 0;
        while (currentIndex < template.length) {
            const openIndex = template.indexOf(options.open, currentIndex);
            if (openIndex !== -1) {
                const text = template.substring(currentIndex, openIndex);
                if (text.length > 0) {
                    currentRenderer.items.push(text);
                }
                const closeIndex = template.indexOf(options.close, openIndex + options.open.length);
                if (closeIndex === -1) {
                    throw `Found open tag at position ${openIndex} but found no close tag`;
                }
                const tag = template.substring(openIndex + options.open.length, closeIndex).trim();
                currentIndex = closeIndex + options.close.length;
                if (tag.startsWith("!")) {
                    //console.debug("Comment:", tag.substring(1));
                } else if (tag.startsWith("#") || tag.startsWith("^")) {
                    const actualTag = tag.substring(1);
                    const nextRenderer = {
                        name: actualTag,
                        negated: tag.startsWith("^"),
                        startIndex: currentIndex,
                        items: []
                    };
                    currentRenderer.items.push(nextRenderer);
                    stack.push(currentRenderer);
                    currentRenderer = nextRenderer;
                } else if (tag.startsWith("/")) {
                    const actualTag = tag.substring(1);
                    if (currentRenderer.name !== actualTag) {
                        throw `End tag ${actualTag} encountered when expecting ${currentRenderer.name}`;
                    }
                    if (stack.length < 1) {
                        throw `No renderer on stack when popping`;
                    }
                    currentRenderer.endIndex = openIndex;
                    currentRenderer = stack.pop();
                } else if (tag.startsWith(">")) {
                    const actualTag = tag.substring(1).trim();
                    const partialElement = document.getElementById(actualTag);
                    if (!partialElement) {
                        throw `Could not find element with id ${actualTag} to use as partial`;
                    }
                    currentRenderer.items.push({
                        name: actualTag,
                        negated: false,
                        partial: partialElement.innerText
                    });
                } else {
                    let actualTag = tag;
                    let escapeHtml = true;
                    if (tag.startsWith("&")) {
                        escapeHtml = false;
                        actualTag = tag.substring(1).trim();
                    } else if (tag.startsWith(options.open.charAt(0)) && template.charAt(currentIndex) === options.close.charAt(options.close.length - 1)) {
                        escapeHtml = false;
                        actualTag = tag.substring(1).trim();
                        currentIndex++;
                    }
                    currentRenderer.items.push(dataStack => {
                        let output;
                        if (actualTag === '.') {
                            output = dataStack[dataStack.length - 1];
                        } else {
                            output = getMatchingFromStack(dataStack, actualTag);
                        }
                        if (output === undefined) {
                            return '';
                        }
                        let result = '' + (typeof output === 'function' ? output.call(null) : output);
                        if (escapeHtml) {
                            return result
                                .replace(/&/g, "&amp;")
                                .replace(/</g, "&lt;")
                                .replace(/>/g, "&gt;")
                                .replace(/"/g, "&quot;")
                                .replace(/'/g, "&#039;");
                        } else {
                            return result;
                        }
                    });
                }
            } else {
                const text = template.substring(currentIndex, template.length);
                currentRenderer.items.push(text);
                currentIndex = template.length;
            }
        }

        function process(renderer, dataStack) {
            let result = '';
            for (let i = 0; i < renderer.items.length; i++) {
                const item = renderer.items[i];
                if (typeof item === 'string') {
                    result += item;
                } else if (typeof item === 'function') {
                    result += item(dataStack);
                } else if (typeof item === 'object') {
                    if (item.partial) {
                        result += parse(item.partial, options).render(dataStack);
                    } else {
                        const nextData = getMatchingFromStack(dataStack, item.name);
                        if (item.negated && nextData === undefined || nextData === false) {
                            dataStack.push(nextData);
                            result += process(item, dataStack);
                            dataStack.pop();
                        } else if (!item.negated && nextData !== undefined) {
                            if (Array.isArray(nextData)) {
                                nextData.forEach(x => {
                                    dataStack.push(x);
                                    result += process(item, dataStack);
                                    dataStack.pop();
                                });
                            } else if (typeof nextData === 'function') {
                                result += nextData.call(null, template.substring(item.startIndex, item.endIndex), text => parse(text, options).render(dataStack));
                            } else {
                                dataStack.push(nextData);
                                result += process(item, dataStack);
                                dataStack.pop();
                            }
                        }
                    }
                } else {
                    throw `Unrecognized type ${typeof item}`;
                }

            }
            return result;
        }

        return {
            render: (data) => process(currentRenderer, Array.isArray(data) ? data : [data])
        };
    }

    window.InPageMustache = {parse};
})();
