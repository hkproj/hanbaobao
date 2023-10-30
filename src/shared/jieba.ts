export interface JiebaDictionaryEntry {
    word: string
    frequency: number
    extra: string
}

export type JiebaDictionary = JiebaDictionaryEntry[]

export interface JiebaData {
    trie: any
    wordFrequencies: any
    totalFrequencies: number
    minFrequency: number
}

function max_of_array(array: Array<any>) {
    return Math.max.apply(Math, array)
}

export function generateTrie(dictionary: JiebaDictionary) {
    const wordFrequencies: any = {}
    const trie: any = {}
    let totalFrequencies = 0.0

    for (var i = 0; i < dictionary.length; i++) {
        const entry = dictionary[i]

        const word = entry.word
        const freq = entry.frequency

        wordFrequencies[word] = freq;
        totalFrequencies += freq;

        var pointer = trie;
        for (var ci = 0; ci < word.length; ci++) {
            var c = word[ci];
            if (!(c in pointer)) {
                pointer[c] = {};
            }
            pointer = pointer[c];
        }
        pointer[''] = ''; // ending flag
    }

    return [trie, wordFrequencies, totalFrequencies];
}

export function initialize(dictionary: JiebaDictionary): JiebaData {

    const data: JiebaData = {
        trie: {},
        wordFrequencies: {},
        totalFrequencies: 0,
        minFrequency: 0
    }

    const output = generateTrie(dictionary);
    data.trie = output[0];
    data.wordFrequencies = output[1];
    data.totalFrequencies = output[2];

    // Calculate the minimum frequency 
    data.minFrequency = Infinity;
    for (const k in data.wordFrequencies) {
        var v = data.wordFrequencies[k];
        // Normalize the frequency
        data.wordFrequencies[k] = Math.log(v / data.totalFrequencies);
        if (data.wordFrequencies[k] < data.minFrequency) {
            data.minFrequency = data.wordFrequencies[k];
        }
    }

    return data;
}

export function getDAG(data: JiebaData, sentence: string) {
    const N = sentence.length
    let charIndex = 0
    let j = 0
    let p = data.trie
    const DAG: any = {}

    while (charIndex < N) {
        var character = sentence[j];
        if (character in p) {
            p = p[character];
            if ('' in p) {
                if (!(charIndex in DAG)) {
                    DAG[charIndex] = [];
                }
                DAG[charIndex].push(j);
            }
            j += 1;
            if (j >= N) {
                charIndex += 1;
                j = charIndex;
                p = data.trie;
            }
        }
        else {
            p = data.trie;
            charIndex += 1;
            j = charIndex;
        }
    }

    for (charIndex = 0; charIndex < sentence.length; charIndex++) {
        if (!(charIndex in DAG)) {
            DAG[charIndex] = [charIndex];
        }
    }

    return DAG;
}

function calc(data: JiebaData, sentence: string, DAG: any, idx: number, route: any) {
    const N = sentence.length;

    route[N] = [0.0, ''];
    for (idx = N - 1; idx > -1; idx--) {
        const candidates = [];
        const candidates_x = [];
        for (const xi in DAG[idx]) {
            var x = DAG[idx][xi];
            var f = ((sentence.substring(idx, x + 1) in data.wordFrequencies) ? data.wordFrequencies[sentence.substring(idx, x + 1)] : data.minFrequency);
            candidates.push(f + route[x + 1][0]);
            candidates_x.push(x);
        }
        var m = max_of_array(candidates);
        route[idx] = [m, candidates_x[candidates.indexOf(m)]];
    }
}

var __cut_DAG_NO_HMM = function (data: JiebaData, sentence: string) {
    var re_eng = /[a-zA-Z0-9]/,
        route: any = {},
        yieldValues = [];

    var DAG = getDAG(data, sentence);
    calc(data, sentence, DAG, 0, route);

    var x = 0,
        buf = '',
        N = sentence.length;

    while (x < N) {
        const y = route[x][1] + 1;
        const l_word = sentence.substring(x, y);
        if (l_word.match(re_eng) && l_word.length == 1) {
            buf += l_word;
            x = y;
        }
        else {
            if (buf.length > 0) {
                yieldValues.push(buf);
                buf = '';
            }
            yieldValues.push(l_word);
            x = y;
        }
    }
    if (buf.length > 0) {
        yieldValues.push(buf);
        buf = '';
    }
    return yieldValues;
}

export function cut(data: JiebaData, sentence: string): Array<string> {
    var cut_all = false
    const yieldValues: Array<string> = []

    var re_han = /([\u4E00-\u9FA5a-zA-Z0-9+#&\._]+)/,
        re_skip = /(\r\n|\s)/;

    var blocks = sentence.split(re_han);
    var cut_block = __cut_DAG_NO_HMM;

    for (const b in blocks) {
        var blk = blocks[b];
        if (blk.length == 0) {
            continue;
        }

        if (blk.match(re_han)) {
            var cutted = cut_block(data, blk);
            for (const w in cutted) {
                var word = cutted[w];
                yieldValues.push(word);
            }
        }
        else {
            var tmp = blk.split(re_skip);
            for (var i = 0; i < tmp.length; i++) {
                var x: any = tmp[i];
                if (x.match(re_skip)) {
                    yieldValues.push(x);
                }
                else if (!cut_all) {
                    for (const xi in x) {
                        yieldValues.push(x[xi]);
                    }
                }
                else {
                    yieldValues.push(x);
                }
            }
        }
    }

    return yieldValues;
}