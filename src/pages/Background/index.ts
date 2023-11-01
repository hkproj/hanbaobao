import { ResourceLoadStatus } from "../../shared/loading";
import { CategorizeSegmentsRequest, CategorizeSegmentsResponse, DUMMY_CONTENT, GenericRequest, GetSelectedTextRequest, GetSelectedTextResponse, RequestType, SearchTermRequest, SearchTermResponse, SegmentTextRequest, SegmentTextResponse, UpdateConfigurationResponse, UpdateKnownWordsResponse } from "../../shared/messages";
import { ChineseDictionary, ChineseDictionaryEntry, HSKVocabulary, HSKVocabularyEntry, WordIndex, getHSKWordsWithSameCharacter, searchWordInChineseDictionary, getKnownWordsWithSameCharacter, SegmentType, categorizeSegments } from "../../shared/chineseUtils";
import { ConfigurationKey, readConfiguration, writeConfiguration } from "../../shared/configuration";
import { JiebaData, JiebaDictionary, JiebaDictionaryEntry, cut, initialize } from "../../shared/jieba";

// Set default configuration values here
let searchServiceEnabled: boolean = false;
let hskEnabled: boolean = true;
let knownWordsEnabled: boolean = true;
let configurationSchemaVersion: number = 1;

let hsk: HSKVocabulary | null = null;
let hskIndex: WordIndex | null = null;
let dictionary: ChineseDictionary | null = null;
let dictionaryIndex: WordIndex | null = null;

let knownWordsIndex: WordIndex | null = null;
let knownWordsList: Array<string> | null = null;

let jiebaData: JiebaData | null = null;

let selectedTextForReader: string | null = null;

let dictionaryLoadStatus: ResourceLoadStatus = ResourceLoadStatus.Unloaded
let knownWordsLoadStatus: ResourceLoadStatus = ResourceLoadStatus.Unloaded
let jiebaLoadStatus: ResourceLoadStatus = ResourceLoadStatus.Unloaded

function createContextMenus() {
    chrome.contextMenus.removeAll()
    chrome.contextMenus.create({
        contexts: ["all"],
        id: "reader-service",
        title: "Chinese Reader"
    })
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId === "reader-service") {
            // Save selected text
            if (info.selectionText != null) {
                console.log(`Selected text: ${info.selectionText!}`)
                selectedTextForReader = info.selectionText
            }
            // Open a new tab with the reader service
            chrome.tabs.create({
                url: chrome.runtime.getURL("reader.html")
            })
        }
    })
}

async function loadJiebaDictionary() {
    let jiebaDictionaryFile = await fetch(chrome.runtime.getURL("data/jieba_dict.json"))

    let jiebaDictionaryRaw = await jiebaDictionaryFile.json()

    let jiebaDictionary: JiebaDictionary = new Array<JiebaDictionaryEntry>() 
    console.log(`Jieba dictionary entries: ${jiebaDictionaryRaw.length}`)
    for (let i = 0; i < jiebaDictionaryRaw.length; ++i) {
        let entry = jiebaDictionaryRaw[i]
        jiebaDictionary.push({
            word: entry[0],
            frequency: entry[1],
            extra: entry[2]
        })
    }

    jiebaData = initialize(jiebaDictionary)
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

    hsk = new Array<HSKVocabularyEntry>()
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
        hskIndex.set(entry.key, entry.indices)
    }

    dictionary = new Array<ChineseDictionaryEntry>()
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
        dictionaryIndex.set(entry.key, entry.indices)
    }

    dictionaryLoadStatus = ResourceLoadStatus.Loaded
}

async function loadKnownWords() {

    const knownWordsIndexRaw = await readConfiguration(ConfigurationKey.KNOWN_WORDS_INDEX, []) as any
    knownWordsList = await readConfiguration(ConfigurationKey.KNOWN_WORDS, []) as Array<string>
    console.log(`Known words list entries count: ${knownWordsList.length}`)

    knownWordsIndex = new Map<string, Array<number>>()
    console.log(`Known words index entries: ${knownWordsIndexRaw.length}`)
    for (let i = 0; i < knownWordsIndexRaw.length; ++i) {
        let entry = knownWordsIndexRaw[i]
        knownWordsIndex.set(entry.key, entry.indices)
    }

    knownWordsLoadStatus = ResourceLoadStatus.Loaded
}

async function loadConfiguration() {
    searchServiceEnabled = await readConfiguration(ConfigurationKey.SEARCH_SERVICE_ENABLED, searchServiceEnabled)
    hskEnabled = await readConfiguration(ConfigurationKey.HSK_ENABLED, hskEnabled)
    knownWordsEnabled = await readConfiguration(ConfigurationKey.KNOWN_WORDS_ENABLED, knownWordsEnabled)
    updateActionBadgeText()
}

chrome.action.onClicked.addListener(async (tab) => {
    await writeConfiguration(ConfigurationKey.SEARCH_SERVICE_ENABLED, !searchServiceEnabled)
    searchServiceEnabled = await readConfiguration(ConfigurationKey.SEARCH_SERVICE_ENABLED, false)
    updateActionBadgeText()
})

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    const req = request as GenericRequest

    switch (req.type) {
        case RequestType.SearchTerm:
            const searchTermRequest = req as SearchTermRequest
            const searchResponse: SearchTermResponse = {
                dummy: DUMMY_CONTENT,
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
            const dictionaryResults = searchWordInChineseDictionary(word, dictionaryIndex!, dictionary!)
            const character = word[0]

            let hskResults: Array<HSKVocabularyEntry> = []
            if (hskEnabled) {
                hskResults = getHSKWordsWithSameCharacter(character, hsk!, hskIndex!)
            }

            let knownWordsResults: string[] = []
            if (knownWordsEnabled) {
                knownWordsResults = getKnownWordsWithSameCharacter(character, knownWordsList!, knownWordsIndex!)
            }

            searchResponse.dictionary = dictionaryResults
            searchResponse.hsk = hskResults
            searchResponse.knownWords = knownWordsResults
            sendResponse(searchResponse)
            break
        case RequestType.UpdateKnownWords:
            await loadKnownWords()
            const updateKnownWordsResponse: UpdateKnownWordsResponse = { dummy: DUMMY_CONTENT }
            console.log('Known words index updated.')
            sendResponse(updateKnownWordsResponse)
            break
        case RequestType.UpdateConfiguration:
            await loadConfiguration()
            const updateConfigurationResponse: UpdateConfigurationResponse = { dummy: DUMMY_CONTENT }
            console.log('Configuration updated.')
            sendResponse(updateConfigurationResponse)
            break
        case RequestType.GetSelectedText:
            const getSelectedTextRequest = req as GetSelectedTextRequest
            const getSelectedTextResponse: GetSelectedTextResponse = {
                dummy: DUMMY_CONTENT,
                selectedText: selectedTextForReader!
            }
            if (getSelectedTextRequest.clean) {
                selectedTextForReader = null
            }
            sendResponse(getSelectedTextResponse)
            break;
        case RequestType.SegmentText:
            const segmentTextRequest = req as SegmentTextRequest
            const segmentTextResponse: SegmentTextResponse = {
                dummy: DUMMY_CONTENT,
                segments: []
            }
            if (jiebaLoadStatus === ResourceLoadStatus.Loaded) {
                const seg = cut(jiebaData!, segmentTextRequest.text)
                segmentTextResponse.segments = seg
            }
            sendResponse(segmentTextResponse)
            break;
        case RequestType.CategorizeSegments:
            const categorizeSegmentsRequest = req as CategorizeSegmentsRequest
            const categorizeSegmentsResponse: CategorizeSegmentsResponse = {
                dummy: DUMMY_CONTENT,
                segmentTypes: []
            }

            const segmentsList = categorizeSegmentsRequest.segments

            if (knownWordsLoadStatus === ResourceLoadStatus.Loaded) {
                const segmentTypes = categorizeSegments(segmentsList, knownWordsIndex!, knownWordsList!)
                categorizeSegmentsResponse.segmentTypes = segmentTypes
            } else {
                const segmentTypes = []
                for (let i = 0; i < segmentsList.length; ++i) {
                    segmentTypes.push(SegmentType.Ignored)
                }
                categorizeSegmentsResponse.segmentTypes = segmentTypes
            }

            sendResponse(categorizeSegmentsResponse)
            break;
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
    // Create context menus
    createContextMenus()
})()
