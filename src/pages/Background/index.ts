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

    userTextsIndex: null,

    knownWordsIndex: null,
    knownWordsList: null,

    ignoredWordsList: null,
    ignoredWordsIndex: null,

    jiebaData: null,

    dictionaryLoadStatus: ResourceLoadStatus.Unloaded,
    knownWordsLoadStatus: ResourceLoadStatus.Unloaded,
    jiebaLoadStatus: ResourceLoadStatus.Unloaded,
    userTextsLoadStatus: ResourceLoadStatus.Unloaded,
}

function createContextMenus() {
    chrome.contextMenus.removeAll()
    chrome.contextMenus.create({
        contexts: ["all"],
        id: "reader-service",
        title: "Chinese Reader"
    })
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId === "reader-service") {
            const selectedTabUrl = tab?.url ?? ""

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

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    const req = request as messages.GenericRequest

    switch (req.type) {
        case messages.RequestType.SearchTerm:
            sendResponse(handlers.handleSearchTermRequest(appState, req as messages.SearchTermRequest))
            break
        case messages.RequestType.UpdateKnownWords:
            sendResponse(await handlers.handleUpdateKnownWordsRequest(appState, req as messages.UpdateKnownWordsRequest))
            break
        case messages.RequestType.UpdateConfiguration:
            sendResponse(await handlers.handleUpdateConfigurationRequest(appState, req as messages.UpdateConfigurationRequest))
            break
        case messages.RequestType.AddNewUserText:
            sendResponse(handlers.handleAddNewUserTextRequest(appState, req as messages.AddNewUserTextRequest))
            break
        case messages.RequestType.GetUserText:
            sendResponse(handlers.handleGetUserTextRequest(appState, req as messages.GetUserTextRequest))
            break
        case messages.RequestType.UpdateUserText:
            sendResponse(handlers.handleUpdateUserText(appState, req as messages.UpdateUserTextRequest))
            break
        default:
            break
    }

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
