interface ChineseDictionaryEntry {
    traditional: string
    simplified: string
    pinyin: string
    definitions: Array<string>
}

type ChineseDictionary = Array<ChineseDictionaryEntry>

interface HSKVocabularyEntry {
    level: number,
    word: string
}

type HSKVocabulary = Array<HSKVocabularyEntry>

interface ChineseDictionarySearchResults {
    data: Array<ChineseDictionaryEntry>
    maxMatchLen: number
}

type WordIndex = Map<string, Array<number>>

let hsk: HSKVocabulary | null = null;
let hskIndex: WordIndex | null = null;
let dictionary: ChineseDictionary | null = null;
let dictionaryIndex: WordIndex | null = null;

let dictionaryLoadStatus = "unloaded";

function searchWordInChineseDictionary(word: string, wordIndex: WordIndex, dictionary: ChineseDictionary): ChineseDictionarySearchResults {
    let results: ChineseDictionarySearchResults = { data: [], maxMatchLen: 0 }

    while (word.length > 0) {
        // Check if the word exists in the dictionary
        if (wordIndex.get(word) != null) {
            // If it exists, add all the entries to the results
            const indices = wordIndex.get(word)!
            indices.forEach((entryIndex) => {
                let entry = dictionary[entryIndex]
                results.data.push(entry)
            })
            // Update the match length
            results.maxMatchLen = Math.max(results.maxMatchLen, word.length)
        }

        // Remove the last character from the word and try again
        word = word.substring(0, word.length - 1)
    }

    if (results.data.length === 0) {
        return results;
    }
    return results;
}

function getWordsWithSameCharacter(charToSearch: string, vocabulary: HSKVocabulary, index: WordIndex): Array<HSKVocabularyEntry> {
    const results: Array<HSKVocabularyEntry> = [];
    if (index.has(charToSearch)) {
        var entryIndices = index.get(charToSearch)!;
        entryIndices.forEach((entryIndex) => {
            results.push(vocabulary[entryIndex]);
        })
    }

    return results;
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

    dictionaryLoadStatus = "loaded";
}

(async () => {
    await loadDictionaries()
})()

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.type) {
        case "search":
            if (dictionaryLoadStatus === "unloaded") {
                sendResponse({
                    dictionary: [],
                    hsk: [],
                    status: dictionaryLoadStatus
                })
                return;
            }

            const word = request.word
            const dictionaryResults = searchWordInChineseDictionary(word, dictionaryIndex!, dictionary!)
            const character = word[0]
            const hskResults = getWordsWithSameCharacter(character, hsk!, hskIndex!)
            sendResponse({
                dictionary: dictionaryResults,
                hsk: hskResults,
                status: dictionaryLoadStatus
            })
            break;
            
        default:
            break;
    }
})