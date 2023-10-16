var fs = require('fs')
var path = require('path')

DATA_DIR = path.join(__dirname, 'src/assets/data')

// Load the dictionary file as JSON
var dictionary = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'dict.json'), 'utf8'))
var hsk = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'hsk.json'), 'utf8'))

// Create an index of the dictionary entries
var wordIndex = {}

// Create a dictionary to map from simplified chinese to the dictionary entry
for (var i = 0; i < dictionary.length; ++i) {
    let entry = dictionary[i]

    if (!(entry.simplified in wordIndex)) {
        wordIndex[entry.simplified] = []
    }

    if (!(entry.traditional in wordIndex)) {
        wordIndex[entry.traditional] = []
    }

    if (!wordIndex[entry.simplified].includes(i)) {
        wordIndex[entry.simplified].push(i)
    }

    if (!wordIndex[entry.traditional].includes(i)) {
        wordIndex[entry.traditional].push(i)
    }
}

var wordIndexArray = []

for (var key in wordIndex) {
    wordIndexArray.push({
        key: key,
        indices: wordIndex[key]
    })
}

var hskWordIndex = {}

for (var i = 0; i < hsk.length; ++i) {
    const entry = hsk[i]

    for (var charIndex = 0; charIndex < entry.word.length; charIndex++) {
        const char = entry.word[charIndex]

        if (!(char in hskWordIndex)) {
            hskWordIndex[char] = []
        }

        if (!hskWordIndex[char].includes(i)) {
            hskWordIndex[char].push(i)
        }
    }
}

var hskWordIndexArray = []

for (var key in hskWordIndex) {
    hskWordIndexArray.push({
        key: key,
        indices: hskWordIndex[key]
    })
}

// Save the wordIndex into a file
fs.writeFileSync(path.join(DATA_DIR, 'dict_index.json'), JSON.stringify(wordIndexArray), 'utf8')

// Save the hskWordIndex into a file
fs.writeFileSync(path.join(DATA_DIR, 'hsk_index.json'), JSON.stringify(hskWordIndexArray), 'utf8')