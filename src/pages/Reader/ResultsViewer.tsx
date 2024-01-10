import React from 'react';

import { SearchTermResponse } from '../../shared/messages';
import { Card, Col, Container, Row } from 'react-bootstrap';

const MAX_DICTIONARY_ENTRIES = 5;
const MAX_HSK_WORDS = 5;
const MAX_KNOWN_WORDS = 5;

import './ResultsViewer.css'
import { getTonifiedPinyin } from '../Content/PopupResultsViewer';

export function ResultsViewer(props: { response: SearchTermResponse }) {

    function getDictionaryResults(response: SearchTermResponse) {
        return <Card className='hanbaobao-section'>
            <Card.Body>
                <Card.Title className='hanbaobao-section-title'>Dictionary</Card.Title>
                <Card.Text>
                    {response.dictionary.data.slice(0, MAX_DICTIONARY_ENTRIES).map((entry, index) => {
                        return <div className='hanbaobao-dictionary-entry' key={index}>
                            <div className='hanbaobao-dictionary-entry-chinese'>
                                <span className='hanbaobao-dictionary-entry-chinese-simplified'>{entry.simplified}</span>
                                <span className='hanbaobao-dictionary-entry-chinese-pinyin'>{getTonifiedPinyin(entry.pinyin)}</span>
                            </div>
                            <div className='hanbaobao-dictionary-entry-definitions'>{entry.definitions.join(' | ')}</div>
                        </div>
                    })
                    }
                </Card.Text>
            </Card.Body>
        </Card>
    }

    function getHSKWordsResults(response: SearchTermResponse) {
        return <>
            <Card className='hanbaobao-section'>
                <Card.Body>
                    <Card.Title className='hanbaobao-section-title'>HSK</Card.Title>
                    <Card.Text>
                        {
                            response.hsk.slice(0, MAX_HSK_WORDS).map((entry, index) => {
                                return <div className='hanbaobao-knownwords-entry'>
                                    <span className='hanbaobao-knownwords-entry-chinese'>HSK {entry.level} - {entry.word}</span>
                                </div>
                            })
                        }
                    </Card.Text>
                </Card.Body>
            </Card>
        </>
    }

    function getKnownWordsResults(response: SearchTermResponse) {
        return <>
            <Card className='hanbaobao-section'>
                <Card.Body>
                    <Card.Title className='hanbaobao-section-title'>Known words</Card.Title>
                    <Card.Text>
                        {
                            response.knownWords.slice(0, MAX_KNOWN_WORDS).map((entry, index) => {
                                return <div className='hanbaobao-knownwords-entry'>
                                    <span className='hanbaobao-knownwords-entry-chinese'>{entry}</span>
                                </div>
                            })
                        }

                    </Card.Text>
                </Card.Body>
            </Card>
        </>
    }

    function getResultsBox(response: SearchTermResponse) {
        return <div className='hanbaobao-results'>
            <Container className='hanbaobao-results-container'>
                <Row>
                    <Col className="col-12">
                        {getDictionaryResults(response)}
                    </Col>
                </Row>
                <Row>
                    <Col className='col-6'>
                        {getKnownWordsResults(response)}
                    </Col>
                    <Col className='col-6'>
                        {getHSKWordsResults(response)}
                    </Col>
                </Row>
            </Container>
        </div>
    }

    return getResultsBox(props.response)
}

