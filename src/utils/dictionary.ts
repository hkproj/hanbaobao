export interface ChineseDictionaryEntry {
    traditional: string
    simplified: string
    pinyin: string
    definitions: Array<string>
}

export type ChineseDictionary = Array<ChineseDictionaryEntry>

export interface HSKVocabularyEntry {
    level: number,
    word: string
}

export type HSKVocabulary = Array<HSKVocabularyEntry>

export interface ChineseDictionarySearchResults {
    data: Array<ChineseDictionaryEntry>
    maxMatchLen: number
}

export type WordIndex = Map<string, Set<number>>

export function searchWordInChineseDictionary(word: string, wordIndex: WordIndex, dictionary: ChineseDictionary): ChineseDictionarySearchResults {
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

export function buildOrLoadChineseDictionaryWordIndex(allowLocalStorage: boolean, localStorageKey: string, dictionary: ChineseDictionary): WordIndex {
    if (allowLocalStorage && localStorage.getItem(localStorageKey) != null) {
        return JSON.parse(localStorage.getItem(localStorageKey)!)
    } else {
        const wordIndex = new Map<string, Set<number>>()

        // Create a dictionary to map from simplified chinese to the dictionary entry
        for (var i = 0; i < dictionary.length; ++i) {
            let entry = dictionary[i]

            if (!wordIndex.has(entry.simplified)) {
                wordIndex.set(entry.simplified, new Set([]))
            }

            if (!wordIndex.has(entry.traditional)) {
                wordIndex.set(entry.traditional, new Set([]))
            }

            // Add the index of the entry to the list of indices for the simplified and traditional characters
            wordIndex.get(entry.simplified)!.add(i)
            wordIndex.get(entry.traditional)!.add(i)
        }

        // Save the word index to local storage
        try {
            if (allowLocalStorage) {
                localStorage.setItem(localStorageKey, JSON.stringify(wordIndex))
            }
        } catch (e) {
            console.error(e)
            // Ignore quota exceeded.
        }
        return wordIndex
    }
}

export function buildOrLoadHSKVocabularyWordIndex(allowLocalStorage: boolean, localStorageKey: string, vocabulary: HSKVocabulary): WordIndex {
    if (allowLocalStorage && localStorage.getItem(localStorageKey) != null) {
        return JSON.parse(localStorage.getItem(localStorageKey)!)
    } else {
        const hskWordIndex = new Map<string, Set<number>>()

        for (var i = 0; i < vocabulary.length; ++i) {
            const entry = vocabulary[i]

            for (var charIndex = 0; charIndex < entry.word.length; charIndex++) {
                const char = entry.word[charIndex]
                
                if (!hskWordIndex.has(char)) {
                    hskWordIndex.set(char, new Set([]))
                }

                hskWordIndex.get(char)!.add(i)
            }
        }

        // Save the word index to local storage
        try {
            if (allowLocalStorage) {
                localStorage.setItem(localStorageKey, JSON.stringify(hskWordIndex))
            }
        } catch (e) {
            console.error(e)
            // Ignore quota exceeded.
        }
        return hskWordIndex
    }
}

export async function downloadOrLoadChineseDictionary(allowLocalStorage: boolean, localStorageKey: string, resourceUrl: string): Promise<[ChineseDictionary | null, number | null]> {
    // Try to load from local storage
    if (allowLocalStorage && localStorage.getItem(localStorageKey) != null) {
        const dict = JSON.parse(localStorage.getItem(localStorageKey)!)
        return [dict, null]
    } else {
        // Fetch from server
        const cedict = await fetch(resourceUrl);
        if (cedict.ok) {
            // Success, save it to local storage
            const json = await cedict.text()
            const dict = JSON.parse(json)
            try {
                if (allowLocalStorage) {
                    localStorage.setItem(localStorageKey, json)
                }
            }
            catch (e) {
                console.error(e)
                // Ignore quota exceeded.
            }
            return [dict, null]
        } else {
            // Error loading from server
            return [null, cedict.status];
        }
    }
}

export async function downloadOrLoadHSKVocabulary(allowLocalStorage: boolean, localStorageKey: string, resourceUrl: string): Promise<[HSKVocabulary | null, number | null]> {
    // Try to load from local storage
    if (allowLocalStorage && localStorage.getItem(localStorageKey) != null) {
        const hskVocabulary = JSON.parse(localStorage.getItem(localStorageKey)!)
        return [hskVocabulary, null]
    } else {
        // Fetch from server
        const hskVocabularyResponse = await fetch(resourceUrl)
        if (hskVocabularyResponse.ok) {
            // Success, save it to local storage
            const json = await hskVocabularyResponse.text()
            const hskVocabulary = JSON.parse(json)
            try {
                if (allowLocalStorage) {
                    localStorage.setItem(localStorageKey, json)
                }
            }
            catch (e) {
                console.error(e)
                // Ignore quota exceeded.
            }
            return [hskVocabulary, null]
        } else {
            // Error loading from server
            return [null, hskVocabularyResponse.status];
        }
    }
}

export function getWordsWithSameCharacter(charToSearch: string, vocabulary: HSKVocabulary, index: WordIndex): Array<HSKVocabularyEntry> {
    const results: Array<HSKVocabularyEntry> = [];
    if (index.has(charToSearch)) {
        var entryIndices = index.get(charToSearch)!;
        entryIndices.forEach((entryIndex) => {
            results.push(vocabulary[entryIndex]);
        })
    }
    
    return results;
}