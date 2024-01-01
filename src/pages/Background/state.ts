import * as chinese from "../../shared/chineseUtils";
import { ResourceLoadStatus } from "../../shared/loading";
import * as jieba from "../../shared/jieba";
import { UserText, addUserText } from "../../shared/userTexts";
import { ConfigurationKey, readConfiguration, writeConfiguration } from "../../shared/configuration";

export interface AppState {
    searchServiceEnabled: boolean
    hskEnabled: boolean
    knownWordsEnabled: boolean
    configurationSchemaVersion: number

    hsk: chinese.HSKVocabulary | null
    hskIndex: chinese.WordIndex | null
    dictionary: chinese.ChineseDictionary | null
    dictionaryIndex: chinese.WordIndex | null

    userTextsIndex: Map<string, UserText> | null

    knownWordsIndex: chinese.WordIndex | null
    knownWordsList: Array<string> | null

    ignoredWordsList: Array<string> | null
    ignoredWordsIndex: chinese.WordIndex | null

    jiebaData: jieba.JiebaData | null

    dictionaryLoadStatus: ResourceLoadStatus
    knownWordsLoadStatus: ResourceLoadStatus
    jiebaLoadStatus: ResourceLoadStatus
    userTextsLoadStatus: ResourceLoadStatus
}

export async function loadJiebaDictionary(appState: AppState) {
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

    appState.jiebaData = jieba.initialize(jiebaDictionary)
    appState.jiebaLoadStatus = ResourceLoadStatus.Loaded
}

export async function loadDictionaries(appState: AppState) {
    let hskFile = await fetch(chrome.runtime.getURL("data/hsk.json"))
    let hskIndexFile = await fetch(chrome.runtime.getURL("data/hsk_index.json"))
    let dictionaryFile = await fetch(chrome.runtime.getURL("data/dict.json"))
    let dictionaryIndexFile = await fetch(chrome.runtime.getURL("data/dict_index.json"))

    let hskRaw = await hskFile.json()
    let hskIndexRaw = await hskIndexFile.json()

    let dictionaryRaw = await dictionaryFile.json()
    let dictionaryIndexRaw = await dictionaryIndexFile.json()

    appState.hsk = new Array<chinese.HSKVocabularyEntry>()
    console.log(`HSK Vocabulary entries: ${hskRaw.length}`)
    for (let i = 0; i < hskRaw.length; ++i) {
        let entry = hskRaw[i]
        appState.hsk.push({
            level: entry.level,
            word: entry.word
        })
    }

    appState.hskIndex = new Map<string, Array<number>>()
    console.log(`HSK Index entries: ${hskIndexRaw.length}`)
    for (let i = 0; i < hskIndexRaw.length; ++i) {
        let entry = hskIndexRaw[i]
        appState.hskIndex.set(entry.key, entry.indices as Array<number>)
    }

    appState.dictionary = new Array<chinese.ChineseDictionaryEntry>()
    console.log(`Dictionary entries: ${dictionaryRaw.length}`)
    for (let i = 0; i < dictionaryRaw.length; ++i) {
        let entry = dictionaryRaw[i]
        appState.dictionary.push({
            traditional: entry.traditional,
            simplified: entry.simplified,
            pinyin: entry.pinyin,
            definitions: entry.definitions
        })
    }

    appState.dictionaryIndex = new Map<string, Array<number>>()
    console.log(`Dictionary index entries: ${dictionaryIndexRaw.length}`)
    for (let i = 0; i < dictionaryIndexRaw.length; ++i) {
        let entry = dictionaryIndexRaw[i]
        appState.dictionaryIndex.set(entry.key, entry.indices as Array<number>)
    }

    appState.dictionaryLoadStatus = ResourceLoadStatus.Loaded
}

export async function loadUserTexts(appState: AppState) {
    const userTextsRaw = await readConfiguration(ConfigurationKey.USER_TEXTS, []) as Array<any>
    console.log(`User texts list entries count: ${userTextsRaw.length}`)

    appState.userTextsIndex = new Map<string, UserText>()
    for (let i = 0; i < userTextsRaw.length; ++i) {
        let entry = userTextsRaw[i]
        appState.userTextsIndex.set(entry.id as string, entry.value as UserText)
    }

    appState.userTextsLoadStatus = ResourceLoadStatus.Loaded
}

export async function saveUserTexts(appState: AppState) {
    const userTextsRaw = new Array<any>()

    appState.userTextsIndex!.forEach((value, key) => {
        userTextsRaw.push({ id: key, value: value })
    })

    await writeConfiguration(ConfigurationKey.USER_TEXTS, userTextsRaw)
}

export async function loadKnownWords(appState: AppState) {

    const knownWordsIndexRaw = await readConfiguration(ConfigurationKey.KNOWN_WORDS_INDEX, []) as any
    appState.knownWordsList = await readConfiguration(ConfigurationKey.KNOWN_WORDS, []) as Array<string>
    console.log(`Known words list entries count: ${appState.knownWordsList.length}`)

    appState.knownWordsIndex = new Map<string, Array<number>>()
    console.log(`Known words index entries: ${knownWordsIndexRaw.length}`)
    for (let i = 0; i < knownWordsIndexRaw.length; ++i) {
        let entry = knownWordsIndexRaw[i]
        appState.knownWordsIndex.set(entry.key, entry.indices as Array<number>)
    }

    appState.knownWordsLoadStatus = ResourceLoadStatus.Loaded
}

export async function loadConfiguration(appState: AppState) {
    appState.searchServiceEnabled = await readConfiguration(ConfigurationKey.SEARCH_SERVICE_ENABLED, appState.searchServiceEnabled)
    appState.hskEnabled = await readConfiguration(ConfigurationKey.HSK_ENABLED, appState.hskEnabled)
    appState.knownWordsEnabled = await readConfiguration(ConfigurationKey.KNOWN_WORDS_ENABLED, appState.knownWordsEnabled)
}

export async function toggleSearchService(appState: AppState) {
    await writeConfiguration(ConfigurationKey.SEARCH_SERVICE_ENABLED, !appState.searchServiceEnabled)
    appState.searchServiceEnabled = await readConfiguration(ConfigurationKey.SEARCH_SERVICE_ENABLED, false)
}