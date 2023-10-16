const clientX = -1
const clientY = -1

const MAX_LEVELS = 10
const MAX_TEXT_CHARS = 7

const findNextTextNode = function (root: Node, previous: Node): Node | null {
    if (root == null) {
        return null;
    }

    var nodeIterator = document.createNodeIterator(root, NodeFilter.SHOW_TEXT, null);
    var node = nodeIterator.nextNode();
    // Make sure to not return the same node again in case we visit the parent, first we need to arrive to the "previous node"
    while (node != previous) {
        node = nodeIterator.nextNode();
        if (node == null) {
            return findNextTextNode(root.parentNode as Node, previous);
        }
    }
    // The next node is right after the "previous" node
    var result = nodeIterator.nextNode();
    if (result != null) {
        return result;
    } else {
        return findNextTextNode(root.parentNode as Node, previous);
    }
}

function getWordUnderCursor(event: MouseEvent) {
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
    return fillWordUnderCursor("", textNode, 0, offset)
}

function fillWordUnderCursor(word: string, node: Node | null, level: number, offset: number): string {
    if (!node) {
        return word;
    }

    let nodeText = node.textContent;
    if (nodeText == null) {
        nodeText = ""
    }

    // Optionally find the begin of the word (space), which is useful for English.
    const begin = offset;

    //Find the end of the word
    let textPos = offset;
    while (textPos < nodeText.length && (textPos - offset) < MAX_TEXT_CHARS) {
        ++textPos;
    }
    const end = textPos;

    let addText = nodeText.substring(begin, end)
    addText = addText.trim()
    let toReturn = word + addText

    if (toReturn.length < MAX_TEXT_CHARS && level < MAX_LEVELS) {
        const nextNode = findNextTextNode(node, node)
        if (nextNode) {
            toReturn = fillWordUnderCursor(toReturn, nextNode, level + 1, 0)
        }
    }

    return toReturn
}

const onMouseMove = function (e: MouseEvent) {
    const wordUnderCursor = getWordUnderCursor(e)
    console.log(`Word under cursor: ${wordUnderCursor}`)
    chrome.runtime.sendMessage({ type: "search", word: wordUnderCursor })
        .then((response: any) => {
            console.log(response)
        })
}

document.addEventListener('mousemove', onMouseMove)