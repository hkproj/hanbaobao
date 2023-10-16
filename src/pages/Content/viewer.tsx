import React, { Component, useState } from 'react';

import { SearchTermResponse } from '../../shared/messages';
import { parseTones, tonifyPinyin } from '../Background/chinese';

const MAX_DICTIONARY_ENTRIES = 5;
const MAX_HSK_WORDS = 5;

export function ResultsViewer(props: { response: SearchTermResponse }) {

    function getDictionaryResults(response: SearchTermResponse) {
        if (response.dictionary.data.length == 0) {
            return null;
        } else {
            return <div className='hanbaobao-dictionary-list'>
                {response.dictionary.data.slice(0, MAX_DICTIONARY_ENTRIES).map((entry, index) => {

                    const syllabes = entry.pinyin.split(/[\s·]+/);
                    let tonifiedPinyin = [];

                    for (var syllabeIndex in syllabes) {
                        var syllabe = syllabes[syllabeIndex];
                        const m = parseTones(syllabe);
                        if (m != null) {
                            const t = tonifyPinyin(m[2], m[4]);
                            const toneNumber = m[4];
                            tonifiedPinyin.push(<span key={syllabeIndex} className={`hanbaobao-pinyin-tone-${toneNumber}`}>{m[1] + t[1] + m[3]}</span>)
                        } else {
                            tonifiedPinyin.push(<span key={syllabeIndex} className={`hanbaobao-pinyin-tone-5`}>{syllabe}</span>)
                        }
                    }

                    return <div className='hanbaobao-dictionary-entry' key={index}>
                        <div className='hanbaobao-dictionary-entry-chinese'>
                            <span className='hanbaobao-dictionary-entry-chinese-simplified'>{entry.simplified}</span>
                            <span className='hanbaobao-dictionary-entry-chinese-pinyin'>{tonifiedPinyin}</span>
                        </div>
                        <div className='hanbaobao-dictionary-entry-definitions'>{entry.definitions.join(' | ')}</div>
                    </div>
                })
                }
            </div>
        }
    }

    function getKnownWordsResults(response: SearchTermResponse) {
        if (response.hsk.length == 0) {
            return null;
        } else {
            return <div className='hanbaobao-knownwords-list'>
                {
                    response.hsk.slice(0, MAX_HSK_WORDS).map((entry, index) => {
                        return <div className='hanbaobao-knownwords-entry'>
                            <span className='hanbaobao-knownwords-entry-chinese'>{entry.word} - HSK {entry.level}</span>
                        </div>
                    })
                }
            </div >
        }
    }

    function getResultsBox(response: SearchTermResponse) {
        return <div className='hanbaobao-results'>
            <div className='hanbaobao-section-title'>Dictionary</div>
            <div className='hanbaobao-section-content'>
                {getDictionaryResults(response)}
            </div>
            <div className='hanbaobao-section-title'>Known Words</div>
            <div className='hanbaobao-section-content'>
                {getKnownWordsResults(response)}
            </div>
        </div>
    }

    return getResultsBox(props.response)
}

