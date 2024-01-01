export function createKnownWordCharacterIndex(wordsList: Array<string>): Array<{ key: string, indices: Array<number> }> {
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

export function createKnownWordIndex(wordsList: Array<string>): Array<{ key: string, index: number }> {
    const index: any = {}
    for (var i = 0; i < wordsList.length; ++i) {
        const word = wordsList[i]

        if (!(word in index)) {
            index[word] = i;
        }
    }

    var indexArray = []
    for (var key in index) {
        indexArray.push({
            key: key,
            index: index[key]
        })
    }

    return indexArray;
}