let assertCounter = 0;

function assertEquals(expected, actual, message = null) {
    if (expected !== actual) {
        if (message === null) {
            message = `expected ${expected}, got ${actual}`;
        }
        console.error(`Assert #${assertCounter + 1} failed at ${(getCallerLocation())}:`, message);
        process.exit(1);
    }
    assertCounter += 1;
}

function assertTrue(value, message = null) {
    if (value !== true) {
        if (message === null) {
            message = "expected true";
        }
        console.error(`Assert #${assertCounter + 1} failed at ${getCallerLocation()}:`, message);
        process.exit(1);
    }
    assertCounter += 1;
}

function fail(message) {
    console.error(`Assert #${assertCounter + 1} failed at ${getCallerLocation()}:`, message);
    process.exit(1);
}

function getCallerLocation() {
    return new Error().stack.split("\n")[3].trim().substring(3);
}

export {assertEquals, assertTrue, fail}
