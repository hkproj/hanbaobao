import { ResourceLoadStatus } from "../../shared/loading";
import { GenericRequest, RequestType, SearchTermRequest, SearchTermResponse } from "../../shared/messages";
import { ChineseDictionary, ChineseDictionaryEntry, HSKVocabulary, HSKVocabularyEntry, WordIndex, getWordsWithSameCharacter, searchWordInChineseDictionary } from "./chinese";
import { ConfigurationKey, readConfiguration, writeConfiguration } from "./configuration";

let enabled: boolean = false;

let hsk: HSKVocabulary | null = null;
let hskIndex: WordIndex | null = null;
let dictionary: ChineseDictionary | null = null;
let dictionaryIndex: WordIndex | null = null;

let dictionaryLoadStatus: ResourceLoadStatus = ResourceLoadStatus.Unloaded

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

// Load dictionaries
(async () => {
    await loadDictionaries()
    enabled = await readConfiguration(ConfigurationKey.ENABLED, false)
})()

function updateActionBadgeText() {
    if (enabled) {
        chrome.action.setBadgeText({ text: "ON" })
    } else {
        chrome.action.setBadgeText({ text: "OFF" })
    }
}

chrome.runtime.onInstalled.addListener(async () => {
    updateActionBadgeText()
    await writeConfiguration(ConfigurationKey.ENABLED, false)
})

chrome.action.onClicked.addListener(async (tab) => {
    await writeConfiguration(ConfigurationKey.ENABLED, !enabled)
    enabled = await readConfiguration(ConfigurationKey.ENABLED, false)
    updateActionBadgeText()
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const req = request as GenericRequest

    switch (req.type) {
        case RequestType.SearchTerm:
            const searchTermRequest = req as SearchTermRequest
            const response: SearchTermResponse = {
                dictionary: { data: [], maxMatchLen: 0 },
                hsk: [],
                status: dictionaryLoadStatus,
                serviceEnabled: enabled
            }

            if (dictionaryLoadStatus === ResourceLoadStatus.Unloaded || !enabled) {
                sendResponse(response)
                return;
            }

            const word = searchTermRequest.searchTerm
            const dictionaryResults = searchWordInChineseDictionary(word, dictionaryIndex!, dictionary!)
            const character = word[0]
            const hskResults = getWordsWithSameCharacter(character, hsk!, hskIndex!)

            response.dictionary = dictionaryResults
            response.hsk = hskResults
            sendResponse(response)
            break;

        default:
            break;
    }
})