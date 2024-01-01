import React, { useEffect, useState } from 'react';
import './OptionsPage.css';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { ConfigurationKey, readConfiguration, writeConfiguration } from '../../shared/configuration';
import { getChineseCharacters } from '../../shared/chineseUtils';
import { Card, Modal, Table } from 'react-bootstrap';
import { GetAllKnownWordsRequest, RequestType, UpdateConfigurationRequest, UpdateKnownWordsRequest } from '../../shared/messages';
import { notifyBackgroundServiceNewConfiguration } from './OptionsPage';
import './KnownWordsView.css'
import 'react-data-grid/lib/styles.css';
import DataGrid from 'react-data-grid';
import { ResourceLoadStatus } from '../../shared/loading';

const KnownWordsView: React.FC = () => {

    const [knownWords, setKnownWords] = useState<Array<string>>([]);
    const [knownWordsLoadStatus, setKnownWordsLoadStatus] = useState<ResourceLoadStatus>(ResourceLoadStatus.Unloaded);

    const [wordsFilter, setWordsFilter] = useState<string>("");
    const [showDeleteAllModal, setShowDeleteAllModal] = useState<boolean>(false);

    const [importWordsText, setImportWordsText] = useState<string>("");

    // Read the configuration on load
    useEffect(() => {
        loadKnownWords(setKnownWords);
    }, []);

    function loadKnownWords(setKnownWords: (words: Array<string>) => void) {
        const request: GetAllKnownWordsRequest = {
            type: RequestType.GetAllKnownWords
        }

        chrome.runtime.sendMessage(request, (response) => {
            if (response) {
                setKnownWords(response.knownWords);
                setKnownWordsLoadStatus(ResourceLoadStatus.Loaded);
            }
        });
    }

    function updateKnownWords(newKnownWords: Array<string>, setKnownWords: (words: Array<string>) => void) {
        // Alert background service to update known words
        const request: UpdateKnownWordsRequest = {
            type: RequestType.UpdateKnownWords,
            newKnownWords: newKnownWords
        }
        chrome.runtime.sendMessage(request)

        setKnownWords(newKnownWords);
    }

    function handleRemoveKnownWord(word: string) {
        const newKnownWords = knownWords.filter((knownWord: string) => {
            return knownWord !== word;
        });

        updateKnownWords(newKnownWords, setKnownWords);
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
        updateKnownWords(newKnownWords, setKnownWords);
    }

    function exportToFile(knownWords: Array<string>) {
        const blob = new Blob([knownWords.join("\n")], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        chrome.downloads.download({
            url: url,
            filename: "known-words.txt"
        });
    }

    function handleShowDeleteAllModal() {
        setShowDeleteAllModal(true);
    }

    function handleCloseDeleteAllModal() {
        setShowDeleteAllModal(false);
    }

    function handleDeleteAllKnownWords() {
        setShowDeleteAllModal(false);
        updateKnownWords([], setKnownWords);
    }

    function getKnownWordsGrid() {
        if (knownWordsLoadStatus != ResourceLoadStatus.Loaded) {
            return <></>;
        } else {
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

            return <DataGrid rowHeight={55} columns={columns} rows={rows}></DataGrid>
        }
    }

    

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
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="wordsFilter">Filter</Form.Label>
                        <Form.Control id="wordsFilter" as="input" value={wordsFilter} readOnly={false} onChange={(e) => setWordsFilter(e.target.value)} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Button variant="danger" onClick={handleShowDeleteAllModal}>Delete all</Button>
                        <Modal show={showDeleteAllModal} onHide={handleCloseDeleteAllModal}>
                            <Modal.Header closeButton>
                                <Modal.Title>
                                    Delete all known words?
                                </Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                If you press yes, all known words will be deleted. This action cannot be undone.
                            </Modal.Body>
                            <Modal.Footer>
                                <Button variant="secondary" onClick={handleCloseDeleteAllModal}>No</Button>
                                <Button variant="primary" onClick={handleDeleteAllKnownWords}>Yes</Button>
                            </Modal.Footer>
                        </Modal>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Button onClick={() => exportToFile(knownWords)}>Export to file</Button>
                    </Form.Group>
                    <Form.Group>
                        {getKnownWordsGrid()}
                    </Form.Group>
                </Form>

            </Card.Body>
        </Card>
    </>
};

export default KnownWordsView;
