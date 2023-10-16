function isChineseCharacter(char: number): boolean {
    return !isNaN(char) && (
        char === 0x25CB ||
        (0x3400 <= char && char <= 0x9FFF) ||
        (0xF900 <= char && char <= 0xFAFF) ||
        (0xFF21 <= char && char <= 0xFF3A) ||
        (0xFF41 <= char && char <= 0xFF5A) ||
        (0xD800 <= char && char <= 0xDFFF)
    );
}

export function getSelectedTextInPage() {
    let text = "";
    if (window.getSelection) {
        let selection = window.getSelection()
        if (selection != null) {
            text = selection.toString();
        }
    // @ts-ignore
    } else if (document.selection && document.selection.type != "Control") {
        // @ts-ignore
        text = document.selection.createRange().text;
    }
    return text;
}

export function getChineseCharacters(text: string): string {
    var chineseChars = ""
    for (var chPos = 0; chPos < text.length; chPos++) {
        var currentChar = text.charCodeAt(chPos);
        if (isChineseCharacter(currentChar)) {
            chineseChars += text[chPos]
        }
    }
    return chineseChars
}

export function getWordUnderCursor(event: MouseEvent) {
    var range, textNode, offset

    // Original code: https://stackoverflow.com/a/30606508/739636
    // @ts-ignore
    if (document.caretPositionFromPoint) {
        // Firefox
        // @ts-ignore
        range = document.caretPositionFromPoint(event.clientX, event.clientY);
        textNode = range.offsetNode;
        offset = range.offset;
    } else if (document.caretRangeFromPoint) {
        // Chrome
        range = document.caretRangeFromPoint(event.clientX, event.clientY);
        textNode = range!.startContainer
        offset = range!.startOffset
    }

    // data contains a full sentence
    // offset represent the cursor position in this sentence
    var data = textNode.data
    var i = offset

    if (!data) {
        return null;
    }

    // Find the begin of the word (space), which is useful for English.
    // if (i > 0) --i;
    // while (i > 0 && data[i] !== " ") { --i; };
    const begin = i

    //Find the end of the word
    i = offset;
    const MAX_CHARS_TO_RETURN = 7
    while (i < data.length && data[i] !== " " && (i - offset) < MAX_CHARS_TO_RETURN) { ++i; }
    const end = i

    // Get the word in the given interval
    var text = data.substring(begin, end)

    // Remove all non-chinese chars
    text = text.trim()
    return text
}