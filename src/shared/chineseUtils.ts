import { AppState } from "../pages/Background/state"

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

export type WordIndex = Map<string, Array<number>>

export enum SegmentType {
    Ignored = 0,
    Known = 1,
    Unknown = 2,
}

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

    return results;
}

export function getHSKWordsWithSameCharacter(charToSearch: string, vocabulary: HSKVocabulary, index: WordIndex): Array<HSKVocabularyEntry> {
    const results: Array<HSKVocabularyEntry> = [];
    if (index.has(charToSearch)) {
        var entryIndices = index.get(charToSearch)!;
        entryIndices.forEach((entryIndex) => {
            results.push(vocabulary[entryIndex]);
        })
    }

    return results;
}

export function getKnownWordsWithSameCharacter(charToSearch: string, knownWordsList: Array<string>, index: WordIndex): Array<string> {
    const results: Array<string> = [];
    if (index.has(charToSearch)) {
        var entryIndices = index.get(charToSearch)!;
        entryIndices.forEach((entryIndex) => {
            results.push(knownWordsList[entryIndex]);
        })
    }

    return results;
}

const HTML_TONES = new Map([
    ["1", '&#772;'],
    ["2", '&#769;'],
    ["3", '&#780;'],
    ["4", '&#768;'],
    ["5", '']
]);

const UNICODE_TONES = new Map([
    ["1", '\u0304'],
    ["2", '\u0301'],
    ["3", '\u030C'],
    ["4", '\u0300'],
    ["5", '']
]);

export function parseTones(s: string) {
    return s.match(/([^AEIOU:aeiou]*)([AEIOUaeiou:]+)([^aeiou:]*)([1-5])/);
}

export function tonifyPinyin(vowels: any, tone: string) {
    let html = '';
    let text = '';

    if (vowels === 'ou') {
        html = 'o' + HTML_TONES.get(tone) + 'u';
        text = 'o' + UNICODE_TONES.get(tone) + 'u';
    } else {
        let tonified = false;
        for (let i = 0; i < vowels.length; i++) {
            let c = vowels.charAt(i);
            html += c;
            text += c;
            if (c === 'a' || c === 'e') {
                html += HTML_TONES.get(tone)!;
                text += UNICODE_TONES.get(tone);
                tonified = true;
            } else if (i === vowels.length - 1 && !tonified) {
                html += HTML_TONES.get(tone)!;
                text += UNICODE_TONES.get(tone);
                tonified = true;
            }
        }
        html = html.replace(/u:/, '&uuml;');
        text = text.replace(/u:/, '\u00FC');
    }

    return [html, text];
}

export function isChineseCharacter(char: number): boolean {
    return !isNaN(char) && (
        char === 0x25CB ||
        (0x3400 <= char && char <= 0x9FFF) ||
        (0xF900 <= char && char <= 0xFAFF) ||
        (0xFF21 <= char && char <= 0xFF3A) ||
        (0xFF41 <= char && char <= 0xFF5A) ||
        (0xD800 <= char && char <= 0xDFFF)
    );
}

export function getChineseCharacters(text: string): string {
    var chineseChars = ""
    for (var chPos = 0; chPos < text.length; chPos++) {
        var currentChar = text.charCodeAt(chPos);
        if (isChineseCharacter(currentChar)) {
            chineseChars += text[chPos]
        }
    }
    return chineseChars
}

export function categorizeSegments(segmentList: string[], appState: AppState): SegmentType[] {
    const segmentTypes: SegmentType[] = []
    segmentList.forEach((segment) => {
        const chineseChars = getChineseCharacters(segment)
        if (chineseChars.length == 0) {
            // The segment is not a Chinese word
            segmentTypes.push(SegmentType.Ignored)
        } else {
            // Check if the segment is a known word
            if (appState.knownWordsIndex!.has(chineseChars)) {
                segmentTypes.push(SegmentType.Known)
            } else {
                segmentTypes.push(SegmentType.Unknown)
            }
        }
    })
    return segmentTypes
}