import React, { useEffect, useState } from 'react';
import './OptionsPage.css';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { ConfigurationKey, readConfiguration, writeConfiguration } from '../../shared/configuration';
import { getChineseCharacters } from '../../shared/chineseUtils';
import { Card, Table } from 'react-bootstrap';
import { RequestType, UpdateConfigurationRequest, UpdateKnownWordsRequest } from '../../shared/messages';
import { notifyBackgroundServiceNewConfiguration } from './OptionsPage';
import './KnownWordsView.css'
import 'react-data-grid/lib/styles.css';
import DataGrid from 'react-data-grid';


const KnownWordsView: React.FC = () => {

    const [knownWords, setKnownWords] = useState<Array<string>>([]);
    const [wordsFilter, setWordsFilter] = useState<string>("");

    const [importWordsText, setImportWordsText] = useState<string>("");

    // Read the configuration on load
    useEffect(() => {
        readConfiguration(ConfigurationKey.KNOWN_WORDS, []).then((value: string[]) => {
            setKnownWords(value);
        }).catch((error: Error) => {
            console.error(error);
        })
    }, []);

    function handleRemoveKnownWord(word: string) {
        const newKnownWords = knownWords.filter((knownWord: string) => {
            return knownWord !== word;
        });

        updateKnownWords(newKnownWords);
    }

    function updateKnownWords(newKnownWords: Array<string>) {
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

    function createKnownWordIndex(wordsList: Array<string>): Array<{ key: string, indices: Array<number> }> {
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

    function handleImportKnownWords(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        e.preventDefault();

        if (importWordsText === "") {
            return;
        }

        const wordsToAdd = importWordsText.split("\n").map((word: string) => {
            return getChineseCharacters(word.trim());
        }).filter((word: string) => {
            return word.length > 0; // Remove whitespaces
        });

        const newList = [...knownWords, ...wordsToAdd];

        // Remove duplicates
        const newKnownWords = newList.filter((word: string, index: number) => {
            return newList.indexOf(word) === index;
        });

        // Sort the list
        newKnownWords.sort((a: string, b: string) => {
            return a.localeCompare(b);
        });

        setImportWordsText("");
        updateKnownWords(newKnownWords);
    }

    const columns = [
        {
            key: "id",
            name: "ID"
        },
        {
            key: "word",
            name: "Word"
        },
        {
            key: "manage",
            name: "Manage",
            renderCell(props: any) {
                return <Button onClick={() => handleRemoveKnownWord(props.row.word)}>Remove</Button>
            }
        }
    ]

    const rows = knownWords.filter((word) => {
        return wordsFilter.trim().length == 0 || word.includes(wordsFilter);
    }).map((word: string, index: number) => {
        return {
            id: index + 1,
            word: word
        }
    })

    return <>
        <Card className='options-card'>
            <Card.Body>
                <Card.Title>Import known words</Card.Title>
                <Form>
                    <Form.Group className="mb-3">
                        <Form.Control as="textarea" rows={3} value={importWordsText} onChange={(e) => setImportWordsText(e.target.value)} />
                    </Form.Group>
                    <Form.Group>
                        <Button onClick={handleImportKnownWords} disabled={!(importWordsText.trim().length > 0)}>Import</Button>
                    </Form.Group>
                </Form>
            </Card.Body>
        </Card>
        <Card className='options-card'>
            <Card.Body>
                <Card.Title>Manage known words</Card.Title>
                <Form>
                    <Form.Group>
                        <Form.Label htmlFor="wordsFilter">Filter</Form.Label>
                        <Form.Control id="wordsFilter" as="input" value={wordsFilter} readOnly={false} onChange={(e) => setWordsFilter(e.target.value)} />
                    </Form.Group>
                    <Form.Group>
                        <DataGrid columns={columns} rows={rows}></DataGrid>
                    </Form.Group>
                </Form>

            </Card.Body>
        </Card>
    </>
};

export default KnownWordsView;
