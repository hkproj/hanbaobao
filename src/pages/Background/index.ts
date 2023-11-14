import { ResourceLoadStatus } from "../../shared/loading";
import * as messages from '../../shared/messages'
import * as chinese from "../../shared/chineseUtils";
import { ConfigurationKey, readConfiguration, writeConfiguration } from "../../shared/configuration";
import * as jieba from "../../shared/jieba";
import { UserText, addUserText } from "../../shared/userTexts";

// Set default configuration values here
let searchServiceEnabled: boolean = false;
let hskEnabled: boolean = true;
let knownWordsEnabled: boolean = true;
let configurationSchemaVersion: number = 1;

let hsk: chinese.HSKVocabulary | null = null;
let hskIndex: chinese.WordIndex | null = null;
let dictionary: chinese.ChineseDictionary | null = null;
let dictionaryIndex: chinese.WordIndex | null = null;

let userTextsIndex: Map<string, UserText> | null = null;

let knownWordsIndex: chinese.WordIndex | null = null;
let knownWordsList: Array<string> | null = null;

let jiebaData: jieba.JiebaData | null = null;

let dictionaryLoadStatus: ResourceLoadStatus = ResourceLoadStatus.Unloaded
let knownWordsLoadStatus: ResourceLoadStatus = ResourceLoadStatus.Unloaded
let jiebaLoadStatus: ResourceLoadStatus = ResourceLoadStatus.Unloaded
let userTextsLoadStatus: ResourceLoadStatus = ResourceLoadStatus.Unloaded

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

            const responsePromise = handleAddNewUserTextRequest(addNewUserTextRequest)
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

async function loadJiebaDictionary() {
    let jiebaDictionaryFile = await fetch(chrome.runtime.getURL("data/jieba_dict.json"))

    let jiebaDictionaryRaw = await jiebaDictionaryFile.json()

    let jiebaDictionary: jieba.JiebaDictionary = new Array<jieba.JiebaDictionaryEntry>()
    console.log(`Jieba dictionary entries: ${jiebaDictionaryRaw.length}`)
    for (let i = 0; i < jiebaDictionaryRaw.length; ++i) {
        let entry = jiebaDictionaryRaw[i]
        jiebaDictionary.push({
            word: entry[0],
            frequency: entry[1],
            extra: entry[2]
        })
    }

    jiebaData = jieba.initialize(jiebaDictionary)
    jiebaLoadStatus = ResourceLoadStatus.Loaded
}

async function loadDictionaries() {
    let hskFile = await fetch(chrome.runtime.getURL("data/hsk.json"))
    let hskIndexFile = await fetch(chrome.runtime.getURL("data/hsk_index.json"))
    let dictionaryFile = await fetch(chrome.runtime.getURL("data/dict.json"))
    let dictionaryIndexFile = await fetch(chrome.runtime.getURL("data/dict_index.json"))

    let hskRaw = await hskFile.json()
    let hskIndexRaw = await hskIndexFile.json()

    let dictionaryRaw = await dictionaryFile.json()
    let dictionaryIndexRaw = await dictionaryIndexFile.json()

    hsk = new Array<chinese.HSKVocabularyEntry>()
    console.log(`HSK Vocabulary entries: ${hskRaw.length}`)
    for (let i = 0; i < hskRaw.length; ++i) {
        let entry = hskRaw[i]
        hsk.push({
            level: entry.level,
            word: entry.word
        })
    }

    hskIndex = new Map<string, Array<number>>()
    console.log(`HSK Index entries: ${hskIndexRaw.length}`)
    for (let i = 0; i < hskIndexRaw.length; ++i) {
        let entry = hskIndexRaw[i]
        hskIndex.set(entry.key, entry.indices as Array<number>)
    }

    dictionary = new Array<chinese.ChineseDictionaryEntry>()
    console.log(`Dictionary entries: ${dictionaryRaw.length}`)
    for (let i = 0; i < dictionaryRaw.length; ++i) {
        let entry = dictionaryRaw[i]
        dictionary.push({
            traditional: entry.traditional,
            simplified: entry.simplified,
            pinyin: entry.pinyin,
            definitions: entry.definitions
        })
    }

    dictionaryIndex = new Map<string, Array<number>>()
    console.log(`Dictionary index entries: ${dictionaryIndexRaw.length}`)
    for (let i = 0; i < dictionaryIndexRaw.length; ++i) {
        let entry = dictionaryIndexRaw[i]
        dictionaryIndex.set(entry.key, entry.indices as Array<number>)
    }

    dictionaryLoadStatus = ResourceLoadStatus.Loaded
}

async function loadUserTexts() {
    const userTextsRaw = await readConfiguration(ConfigurationKey.USER_TEXTS, []) as Array<any>
    console.log(`User texts list entries count: ${userTextsRaw.length}`)

    userTextsIndex = new Map<string, UserText>()
    for (let i = 0; i < userTextsRaw.length; ++i) {
        let entry = userTextsRaw[i]
        userTextsIndex.set(entry.id as string, entry.value as UserText)
    }

    userTextsLoadStatus = ResourceLoadStatus.Loaded
}

async function saveUserTexts() {
    const userTextsRaw = new Array<any>()

    userTextsIndex!.forEach((value, key) => {
        userTextsRaw.push({ id: key, value: value })
    })

    await writeConfiguration(ConfigurationKey.USER_TEXTS, userTextsRaw)
}

async function loadKnownWords() {

    const knownWordsIndexRaw = await readConfiguration(ConfigurationKey.KNOWN_WORDS_INDEX, []) as any
    knownWordsList = await readConfiguration(ConfigurationKey.KNOWN_WORDS, []) as Array<string>
    console.log(`Known words list entries count: ${knownWordsList.length}`)

    knownWordsIndex = new Map<string, Array<number>>()
    console.log(`Known words index entries: ${knownWordsIndexRaw.length}`)
    for (let i = 0; i < knownWordsIndexRaw.length; ++i) {
        let entry = knownWordsIndexRaw[i]
        knownWordsIndex.set(entry.key, entry.indices as Array<number>)
    }

    knownWordsLoadStatus = ResourceLoadStatus.Loaded
}

async function loadConfiguration() {
    searchServiceEnabled = await readConfiguration(ConfigurationKey.SEARCH_SERVICE_ENABLED, searchServiceEnabled)
    hskEnabled = await readConfiguration(ConfigurationKey.HSK_ENABLED, hskEnabled)
    knownWordsEnabled = await readConfiguration(ConfigurationKey.KNOWN_WORDS_ENABLED, knownWordsEnabled)
    updateActionBadgeText()
}

async function handleAddNewUserTextRequest(addNewUserTextRequest: messages.AddNewUserTextRequest) {
    const addNewUserTextResponse: messages.AddNewUserTextResponse = { dummy: messages.DUMMY_CONTENT, id: null }

    if (userTextsLoadStatus != ResourceLoadStatus.Loaded || jiebaLoadStatus != ResourceLoadStatus.Loaded || knownWordsLoadStatus != ResourceLoadStatus.Loaded) {
        return addNewUserTextResponse
    }

    const segments = jieba.cut(jiebaData!, addNewUserTextRequest.text)
    const segmentTypes = chinese.categorizeSegments(segments, knownWordsIndex!, knownWordsList!)
    const userTextToAdd: UserText = {
        id: "", // It will be assigned a new unique id
        name: "New user text",
        url: addNewUserTextRequest.url,
        segments: segments,
        segmentTypes: segmentTypes,
        created: new Date(),
    }

    const [newUserText, newUserTextsIndex] = await addUserText(userTextsIndex!, userTextToAdd)
    // Verify that the id has been assigned, otherwise throw an error
    if (newUserText.id == null || newUserText.id == "") {
        throw new Error("No id was assigned to a newly created user text")
    }

    // Save the new user text and the list
    addNewUserTextResponse.id = newUserText.id
    userTextsIndex = newUserTextsIndex
    saveUserTexts()

    return addNewUserTextResponse
}

chrome.action.onClicked.addListener(async (tab) => {
    await writeConfiguration(ConfigurationKey.SEARCH_SERVICE_ENABLED, !searchServiceEnabled)
    searchServiceEnabled = await readConfiguration(ConfigurationKey.SEARCH_SERVICE_ENABLED, false)
    updateActionBadgeText()
})

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    const req = request as messages.GenericRequest

    switch (req.type) {
        case messages.RequestType.SearchTerm:
            const searchTermRequest = req as messages.SearchTermRequest
            const searchResponse: messages.SearchTermResponse = {
                dummy: messages.DUMMY_CONTENT,
                dictionary: { data: [], maxMatchLen: 0 },
                hsk: [],
                knownWords: [],
                status: dictionaryLoadStatus,
                serviceEnabled: searchServiceEnabled
            }

            if (dictionaryLoadStatus === ResourceLoadStatus.Unloaded || !searchServiceEnabled) {
                sendResponse(searchResponse)
                return
            }

            const word = searchTermRequest.searchTerm
            const dictionaryResults = chinese.searchWordInChineseDictionary(word, dictionaryIndex!, dictionary!)
            const character = word[0]

            let hskResults: Array<chinese.HSKVocabularyEntry> = []
            if (hskEnabled) {
                hskResults = chinese.getHSKWordsWithSameCharacter(character, hsk!, hskIndex!)
            }

            let knownWordsResults: string[] = []
            if (knownWordsEnabled) {
                knownWordsResults = chinese.getKnownWordsWithSameCharacter(character, knownWordsList!, knownWordsIndex!)
            }

            searchResponse.dictionary = dictionaryResults
            searchResponse.hsk = hskResults
            searchResponse.knownWords = knownWordsResults
            sendResponse(searchResponse)
            break
        case messages.RequestType.UpdateKnownWords:
            await loadKnownWords()
            const updateKnownWordsResponse: messages.UpdateKnownWordsResponse = { dummy: messages.DUMMY_CONTENT }
            console.log('Known words index updated.')
            sendResponse(updateKnownWordsResponse)
            break
        case messages.RequestType.UpdateConfiguration:
            await loadConfiguration()
            const updateConfigurationResponse: messages.UpdateConfigurationResponse = { dummy: messages.DUMMY_CONTENT }
            console.log('Configuration updated.')
            sendResponse(updateConfigurationResponse)
            break
        case messages.RequestType.AddNewUserText:
            sendResponse(handleAddNewUserTextRequest(req as messages.AddNewUserTextRequest))
            break;
        case messages.RequestType.GetUserText:
            const getUserTextRequest = req as messages.GetUserTextRequest
            const getUserTextResponse: messages.GetUserTextResponse = { dummy: messages.DUMMY_CONTENT, userText: null }

            if (userTextsLoadStatus != ResourceLoadStatus.Loaded) {
                // Not loaded
                sendResponse(getUserTextResponse)
                return
            }

            if (userTextsIndex!.has(getUserTextRequest.id) == false) {
                // Not found
                sendResponse(getUserTextResponse)
                return
            }

            // Return the user text
            const userText = userTextsIndex!.get(getUserTextRequest.id)!
            getUserTextResponse.userText = userText
            sendResponse(getUserTextResponse)
            break
        case messages.RequestType.UpdateUserText:
            const updateUserTextRequest = req as messages.UpdateUserTextRequest
            const updateUserTextResponse: messages.UpdateUserTextResponse = { dummy: messages.DUMMY_CONTENT }

            if (userTextsLoadStatus != ResourceLoadStatus.Loaded) {
                // Not loaded
                sendResponse(updateUserTextResponse)
                return
            }

            if (userTextsIndex!.has(updateUserTextRequest.userText.id) == false) {
                // Not found
                sendResponse(updateUserTextResponse)
                return
            }

            // Update the user text
            userTextsIndex!.set(updateUserTextRequest.userText.id, updateUserTextRequest.userText)
            saveUserTexts()
            sendResponse(updateUserTextResponse)
            break
        default:
            break
    }

    return true
})

function updateActionBadgeText() {
    if (searchServiceEnabled) {
        chrome.action.setBadgeText({ text: "ON" })
    } else {
        chrome.action.setBadgeText({ text: "OFF" })
    }
}

chrome.runtime.onInstalled.addListener(async () => {
    // Read configuration or set default values if missing
    loadConfiguration()
});

(async () => {
    // Load configuration
    await loadConfiguration()
    // Load dictionaries
    await loadDictionaries()
    // Load known words
    await loadKnownWords()
    // Load Jieba dictionary
    await loadJiebaDictionary()
    // Load user texts
    await loadUserTexts()
    // Create context menus
    createContextMenus()
})()
