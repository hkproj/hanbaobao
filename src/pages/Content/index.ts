import { RequestType, SearchTermRequest, SearchTermResponse } from "../../shared/messages"
import { getWordUnderCursor } from "./textSelect"
import { Root, createRoot } from 'react-dom/client';
import { ResultsViewer } from "./viewer";
import { ResourceLoadStatus } from "../../shared/loading";

let appContainer: HTMLDivElement | null = null;
let appRoot: Root | null = null;

let mousePosition: { clientX: number, clientY: number, pageX: number, pageY: number } = { clientX: 0, clientY: 0, pageX: 0, pageY: 0 }
let nodeUnderCursor: Node | null = null

function displayOrUpdateResults(response: SearchTermResponse) {
    if (appRoot == null) {
        createContainers()
    }

    const xOffset = 20
    const yOffset = 20
    appContainer?.style.setProperty('top', `${mousePosition.pageY + yOffset}px`)
    appContainer?.style.setProperty('left', `${mousePosition.pageX + xOffset}px`)

    if (response.serviceEnabled == false) {
        // console.log("Service is disabled")
    }

    if (response.status != ResourceLoadStatus.Loaded || (response.dictionary.data.length == 0 && response.hsk.length == 0) || response.serviceEnabled == false) {
        appContainer!.style.display = 'none';
    } else {
        appContainer!.style.display = 'block';
    }

    appRoot!.render(ResultsViewer({ response }))
}

function createContainers() {
    // Add the root div
    appContainer = document.createElement('div')
    appContainer.id = 'hanbaobao-window'
    document.body.appendChild(appContainer)

    // Add the css file
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.type = 'text/css'
    link.href = chrome.runtime.getURL('content.styles.css')
    document.head.appendChild(link)

    // Create React component
    appRoot = createRoot(appContainer)
}

const onMouseMove = function (e: MouseEvent) {
    // Update the mouse position
    mousePosition = { clientX: e.clientX, clientY: e.clientY, pageX: e.pageX, pageY: e.pageY }

    // Search the dictionary
    const [wordUnderCursor, node] = getWordUnderCursor(e)
    if (wordUnderCursor == "" || node == null) {
        return
    }
    nodeUnderCursor = node

    // console.log(`Word under cursor: ${wordUnderCursor} - Node: ${node}`)
    const request: SearchTermRequest = { type: RequestType.SearchTerm, searchTerm: wordUnderCursor }

    chrome.runtime.sendMessage(request)
        .then((response: SearchTermResponse) => {
            if (response != null) {
                displayOrUpdateResults(response)
            }
        })
}

document.addEventListener('mousemove', onMouseMove)