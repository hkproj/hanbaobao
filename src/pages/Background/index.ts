import { ResourceLoadStatus } from "../../shared/loading";
import * as messages from '../../shared/messages'
import * as handlers from './handlers'
import * as state from "./state";

let appState: state.AppState = {
    searchServiceEnabled: false,
    hskEnabled: true,
    knownWordsEnabled: true,
    configurationSchemaVersion: 1,

    hsk: null,
    hskIndex: null,
    dictionary: null,
    dictionaryIndex: null,
    dictionaryLoadStatus: ResourceLoadStatus.Unloaded,

    userTextsIndex: null,
    userTextsLoadStatus: ResourceLoadStatus.Unloaded,

    knownWordsCharacterIndex: null,
    knownWordsIndex: null,
    knownWordsList: null,
    knownWordsLoadStatus: ResourceLoadStatus.Unloaded,

    ignoredWordsList: null,
    ignoredWordsIndex: null,

    jiebaData: null,
    jiebaLoadStatus: ResourceLoadStatus.Unloaded,
}

function createContextMenus() {
    chrome.contextMenus.removeAll()

    chrome.contextMenus.create({
        contexts: ["all"],
        id: "reader-service",
        title: "Chinese Reader"
    })

    chrome.contextMenus.create({
        contexts: ["all"],
        id: "user-texts-list",
        title: "User Texts"
    })

    chrome.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId === "reader-service") {
            const selectedTabUrl = tab?.url ?? ""

            // Check if the selected text is empty (after removing whitespace)
            if (info.selectionText == null || info.selectionText?.trim() == "") {
                return
            }

            // Send a message to create a new user text
            const addNewUserTextRequest: messages.AddNewUserTextRequest = {
                type: messages.RequestType.AddNewUserText,
                url: selectedTabUrl,
                text: info.selectionText!
            }

            const responsePromise = handlers.handleAddNewUserTextRequest(appState, addNewUserTextRequest)
            responsePromise.then((response) => {
                if (response.id != null) {
                    // Open a new tab with the reader service
                    chrome.tabs.create({
                        url: chrome.runtime.getURL(`reader.html?id=${response.id}`)
                    })
                } else {
                    console.error(`Error creating new user text. Selected text: ${info.selectionText!}`)
                }
            })
        } else if (info.menuItemId == "user-texts-list") {
            // Open a new tab with the user texts list
            chrome.tabs.create({
                url: chrome.runtime.getURL(`userTexts.html`)
            })
        }
    })
}

function updateActionBadgeText() {
    if (appState.searchServiceEnabled) {
        chrome.action.setBadgeText({ text: "ON" })
    } else {
        chrome.action.setBadgeText({ text: "OFF" })
    }
}

async function handleMessage(request: any): Promise<any> {
    const req = request as messages.GenericRequest

    switch (req.type) {
        case messages.RequestType.SearchTerm:
            return await handlers.handleSearchTermRequest(appState, req as messages.SearchTermRequest)
        case messages.RequestType.GetAllKnownWords:
            return await handlers.handleGetAllKnownWordsRequest(appState, req as messages.GetAllKnownWordsRequest)
        case messages.RequestType.UpdateKnownWords:
            return await handlers.handleUpdateKnownWordsRequest(appState, req as messages.UpdateKnownWordsRequest)
        case messages.RequestType.AddKnownWord:
            return await handlers.handleAddKnownWordRequest(appState, req as messages.AddKnownWordRequest)
        case messages.RequestType.RemoveKnownWord:
            return await handlers.handleRemoveKnownWordRequest(appState, req as messages.RemoveKnownWordRequest)
        case messages.RequestType.UpdateConfiguration:
            return await handlers.handleUpdateConfigurationRequest(appState, req as messages.UpdateConfigurationRequest)
        case messages.RequestType.AddNewUserText:
            return await handlers.handleAddNewUserTextRequest(appState, req as messages.AddNewUserTextRequest)
        case messages.RequestType.GetUserText:
            return await handlers.handleGetUserTextRequest(appState, req as messages.GetUserTextRequest)
        case messages.RequestType.UpdateUserText:
            return await handlers.handleUpdateUserTextRequest(appState, req as messages.UpdateUserTextRequest)
        case messages.RequestType.GetUserTextsList:
            return await handlers.handleGetUserTextsListRequest(appState, req as messages.GetUserTextsListRequest)
        case messages.RequestType.DeleteUserText:
            return await handlers.handleDeleteUserTextRequest(appState, req as messages.DeleteUserTextRequest)
        case messages.RequestType.JoinSegmentsInUserText:
            return await handlers.handleJoinSegmentsInUserTextRequest(appState, req as messages.JoinSegmentsInUserTextRequest)
            case messages.RequestType.SplitSegmentsInUserText:
            return await handlers.handleSplitSegmentsInUserTextRequest(appState, req as messages.SplitSegmentsInUserTextRequest)
        default:
            console.error(`Unknown request type: ${req.type}`)
            return { dummy: messages.DUMMY_CONTENT } as messages.GenericResponse
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    handleMessage(request).then((response) => {
        sendResponse(response)
    })
    return true
})

chrome.action.onClicked.addListener(async (tab) => {
    state.toggleSearchService(appState)
    updateActionBadgeText()
})

chrome.runtime.onInstalled.addListener(async () => {
    // Read configuration or set default values if missing
    state.loadConfiguration(appState)
    // Update action badge texts
    updateActionBadgeText()
});

(async () => {
    // Load configuration
    await state.loadConfiguration(appState)
    // Update action badge texts
    updateActionBadgeText()
    // Load dictionaries
    await state.loadDictionaries(appState)
    // Load known words
    await state.loadKnownWords(appState)
    // Load Jieba dictionary
    await state.loadJiebaDictionary(appState)
    // Load user texts
    await state.loadUserTexts(appState)
    // Create context menus
    createContextMenus()
})()
