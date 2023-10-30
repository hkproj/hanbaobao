import { RequestType, SearchTermRequest, SearchTermResponse } from "../../shared/messages"
import { getWordUnderCursor } from "./textSelect"
import { Root, createRoot } from 'react-dom/client';
import { ResultsViewer } from "./ResultsViewer";
import { ResourceLoadStatus } from "../../shared/loading";
import 'bootstrap/dist/css/bootstrap.min.css'

let appContainer: HTMLDivElement | null = null;
let appRoot: Root | null = null;

const MIN_MOUSE_DISTANCE = 5;

let mousePosition: { clientX: number, clientY: number, pageX: number, pageY: number } = { clientX: 0, clientY: 0, pageX: 0, pageY: 0 }
let nodeUnderCursor: Node | null = null

function displayOrUpdateResults(response: SearchTermResponse) {
    if (appRoot == null) {
        createContainers()
    }

    if (appContainer != null && appContainer.className == "hanbaobao-window-dynamic") {
        const xOffset = 20
        const yOffset = 20
    
        let windowPositionX = mousePosition.pageX + xOffset
        let windowPositionY = mousePosition.pageY + yOffset
    
        appContainer?.style.setProperty('top', `${windowPositionY}px`)
        appContainer?.style.setProperty('left', `${windowPositionX}px`)
    
        // if (response.serviceEnabled == false) {
        //     console.log("Service is disabled")
        // }
    
        if (response.status != ResourceLoadStatus.Loaded || (response.dictionary.data.length == 0 && response.hsk.length == 0 && response.knownWords.length == 0) || response.serviceEnabled == false) {
            appContainer!.style.display = 'none';
        } else {
            appContainer!.style.display = 'block';
        }
    }    

    appRoot!.render(ResultsViewer({ response }))
}

function createContainers() {
    // If a designated place already exists for the window, then no need to create it.
    if (document.getElementById('hanbaobao-window') != null) {
        appContainer = document.getElementById('hanbaobao-window') as HTMLDivElement
        appContainer.className = "hanbaobao-window-static"
    } else {
        // Add the root div
        appContainer = document.createElement('div')
        appContainer.id = "hanbaobao-window"
        appContainer.className = "hanbaobao-window-dynamic"
        document.body.appendChild(appContainer)

        // Add the css file
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.type = 'text/css'
        link.href = chrome.runtime.getURL('content.styles.css')
        document.head.appendChild(link)
    }

    // Create React component
    appRoot = createRoot(appContainer)
}

const onMouseMove = function (e: MouseEvent) {
    // Check if compared to the old position the mouse has moved enough
    const dx = e.clientX - mousePosition.clientX
    const dy = e.clientY - mousePosition.clientY
    const distance = Math.sqrt(dx * dx + dy * dy)
    if (distance < MIN_MOUSE_DISTANCE) {
        return
    }

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