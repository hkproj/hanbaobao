import { ConfigurationKey, readConfiguration, writeConfiguration } from "./configuration";
import { RequestType, UpdateKnownWordsRequest } from "./messages";

export function updateKnownWords(newKnownWords: Array<string>, setKnownWords: (words: Array<string>) => void) {
    setKnownWords(newKnownWords);
    const wordsIndex = createKnownWordIndex(newKnownWords);
    const w1 = writeConfiguration(ConfigurationKey.KNOWN_WORDS, newKnownWords);
    const w2 = writeConfiguration(ConfigurationKey.KNOWN_WORDS_INDEX, wordsIndex);

    Promise.all([w1, w2]).then(() => {
        // Alert background service to update known words
        const request: UpdateKnownWordsRequest = {
            type: RequestType.UpdateKnownWords,
        }
        chrome.runtime.sendMessage(request)
    }).catch((error: Error) => {
        console.error(error);
    });
}

export function loadKnownWords(setKnownWords: (words: Array<string>) => void) {
    readConfiguration(ConfigurationKey.KNOWN_WORDS, []).then((value: string[]) => {
        setKnownWords(value);
    }).catch((error: Error) => {
        console.error(error);
    })
}

export function createKnownWordIndex(wordsList: Array<string>): Array<{ key: string, indices: Array<number> }> {
    const index: any = {}
    for (var i = 0; i < wordsList.length; ++i) {
        const entry = wordsList[i]

        for (var charIndex = 0; charIndex < entry.length; charIndex++) {
            const char = entry[charIndex]

            if (!(char in index)) {
                index[char] = [];
            }

            if (!index[char].includes(i)) {
                index[char].push(i)
            }
        }
    }

    var indexArray = []
    for (var key in index) {
        indexArray.push({
            key: key,
            indices: index[key]
        })
    }

    return indexArray;
}