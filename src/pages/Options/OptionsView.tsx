import React, { useEffect, useState } from 'react';
import { Card, Form } from 'react-bootstrap';
import { ConfigurationKey, readConfiguration, writeConfiguration } from '../../shared/configuration';
import { notifyBackgroundServiceNewConfiguration } from './OptionsPage';

const OptionsView: React.FC = () => {

    const [hskEnabled, setHSKEnabled] = useState(false);
    const [knownWordsEabled, setKnownWordsEnabled] = useState(false);

    // Load configuration on load
    useEffect(() => {
        readConfiguration(ConfigurationKey.HSK_ENABLED).then((value: boolean) => {
            setHSKEnabled(value);
        }).catch((error: Error) => {
            console.error(error);
        })

        readConfiguration(ConfigurationKey.KNOWN_WORDS_ENABLED, false).then((value: boolean) => {
            setKnownWordsEnabled(value);
        }).catch((error: Error) => {
            console.error(error);
        })
    }, []);

    function handleSetHSKEnabled(e: React.ChangeEvent<HTMLInputElement>) {
        setHSKEnabled(e.target.checked);
        writeConfiguration(ConfigurationKey.HSK_ENABLED, e.target.checked)
        notifyBackgroundServiceNewConfiguration()
    }

    function handleSetKnownWordsEnabled(e: React.ChangeEvent<HTMLInputElement>) {
        setKnownWordsEnabled(e.target.checked);
        writeConfiguration(ConfigurationKey.KNOWN_WORDS_ENABLED, e.target.checked)
        notifyBackgroundServiceNewConfiguration()
    }

    return <>
        <Card>
            <Card.Body>
                <Card.Title>Display known words</Card.Title>
                <Form>
                    <Form.Group>
                        <Form.Label for={`hsk-enabled`}>HSK enabled</Form.Label>
                        <Form.Check
                            type="switch"
                            id={`hsk-enabled`}
                            checked={hskEnabled}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSetHSKEnabled(e)}
                        />
                    </Form.Group>
                    <Form.Group>
                        <Form.Label for={`known-words-enabled`}>Known words enabled</Form.Label>
                        <Form.Check
                            type="switch"
                            id={`known-words-enabled`}
                            checked={knownWordsEabled}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSetKnownWordsEnabled(e)}
                        />
                    </Form.Group>
                </Form>


            </Card.Body>
        </Card>
    </>

}

export default OptionsView