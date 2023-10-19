import React from 'react';
import './OptionsPage.css';
import Button from 'react-bootstrap/Button';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import { Card, Container } from 'react-bootstrap';
import KnownWordsView from './KnownWordsView';
import OptionsView from './OptionsView';
import { RequestType, UpdateConfigurationRequest } from '../../shared/messages';

interface Props {
  title: string;
}

export function notifyBackgroundServiceNewConfiguration() {
  // Alert background service to update known words
  const request: UpdateConfigurationRequest = {
    type: RequestType.UpdateConfiguration,
  }
  chrome.runtime.sendMessage(request)
}

const OptionsPage: React.FC<Props> = ({ title }: Props) => {
  return <Container>
    <Tabs
      className="options-tabs"
      defaultActiveKey="options"
      id="options-tabs"
    >
      <Tab eventKey="options" title="Options" className="options-single-tab">
        <Card className='page-card'>
          <Card.Body>
            <OptionsView />
          </Card.Body>
        </Card>
      </Tab>
      <Tab eventKey="known-words" title="Known words" className="options-single-tab">
        <Card className='page-card'>
          <Card.Body>
            <KnownWordsView />
          </Card.Body>
        </Card>
      </Tab>
    </Tabs>
  </Container>;
};

export default OptionsPage;
