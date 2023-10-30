import React, { useEffect, useState } from 'react';
import { Col, Container, Row } from 'react-bootstrap'
import { GetSelectedTextRequest, GetSelectedTextResponse, RequestType, SegmentTextRequest, SegmentTextResponse } from '../../shared/messages'
import { ResourceLoadStatus } from '../../shared/loading';

import 'bootstrap/dist/css/bootstrap.min.css'
import './ReaderPage.scss';

import '../Content/index'
import '../Content/content.styles.css'

const Reader = () => {

  const [text, setText] = useState('');
  const [segmentsLoadingStatus, setSegmentsLoadingStatus] = useState(ResourceLoadStatus.Unloaded);
  const [textSegments, setTextSegments] = useState<string[]>([]);

  useEffect(() => {
    const request: GetSelectedTextRequest = { type: RequestType.GetSelectedText, clean: true }
    chrome.runtime.sendMessage(request, (response) => {
      const getTextResp: GetSelectedTextResponse = response as GetSelectedTextResponse
      setSegmentsLoadingStatus(ResourceLoadStatus.Unloaded)
      setText(getTextResp.selectedText)
    })
  }, [])

  useEffect(() => {
    // Cut the text
    setSegmentsLoadingStatus(ResourceLoadStatus.Loading)
    const request: SegmentTextRequest = { type: RequestType.SegmentText, text: text }
    chrome.runtime.sendMessage(request, (response) => {
      const segmentTextResp: SegmentTextResponse = response as SegmentTextResponse
      setSegmentsLoadingStatus(ResourceLoadStatus.Loaded)
      setTextSegments(segmentTextResp.segments)
    })

  }, [text])

  function getTextView() {
    if (text == null) {
      return <p>No text selected.</p>;
    } else if (segmentsLoadingStatus === ResourceLoadStatus.Loading) {
      return <p>Loading...</p>;
    } else {
      return <div className="segment-list">
        {textSegments.map((segment, index) => {
          return <span className="segment" key={index}>{segment}</span>
        })}
      </div>
    }
  }

  return (
    <Container fluid={true}>
      <div className='row align-center'>
        <h1>Reader</h1>
      </div>
      <div className="row">
        <div className="col-8">
          {getTextView()}
        </div>
        <div className="col-4">
          <div id="hanbaobao-window"></div>
        </div>
      </div>
    </Container>
  );
};

export default Reader;
