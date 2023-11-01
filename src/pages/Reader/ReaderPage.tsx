import React, { useEffect, useRef, useState } from 'react';
import { Col, Container, Row } from 'react-bootstrap'
import { CategorizeSegmentsRequest, CategorizeSegmentsResponse, DUMMY_CONTENT, GetSelectedTextRequest, GetSelectedTextResponse, RequestType, SearchTermRequest, SearchTermResponse, SegmentTextRequest, SegmentTextResponse } from '../../shared/messages'
import { ResourceLoadStatus } from '../../shared/loading';

import 'bootstrap/dist/css/bootstrap.min.css'
import './ReaderPage.scss';
import { ResultsViewer } from './ResultsViewer';
import { getWordUnderCursor } from '../Content/textSelect';
import { SegmentType } from '../../shared/chineseUtils';

const EMPTY_RESULTS: SearchTermResponse = {
  dictionary: {
    data: [],
    maxMatchLen: 0
  },
  hsk: [],
  knownWords: [],
  serviceEnabled: true,
  status: ResourceLoadStatus.Loaded,
  dummy: DUMMY_CONTENT
}

const Reader = () => {

  const [text, setText] = useState('');
  const [segmentsLoadingStatus, setSegmentsLoadingStatus] = useState(ResourceLoadStatus.Unloaded);
  const [textSegments, setTextSegments] = useState<string[]>([]);
  const [textSegmentTypes, setTextSegmentTypes] = useState<SegmentType[]>([]);

  const [selectedSegmentNode, setSelectedSegmentNode] = useState<Node | null>(null);
  const [selectedSegmentOffset, setSelectedSegmentOffset] = useState<number | null>(null);
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number | null>(null);

  const [searchTermResponse, setSearchTermResponse] = useState<SearchTermResponse>(EMPTY_RESULTS);

  useEffect(() => {
    // Get the selected text
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

  useEffect(() => {
    // Categorize the segments when the segments change
    const request: CategorizeSegmentsRequest = { type: RequestType.CategorizeSegments, segments: textSegments }
    chrome.runtime.sendMessage(request, (response) => {
      const categorizeSegResp: CategorizeSegmentsResponse = response as CategorizeSegmentsResponse
      setTextSegmentTypes(categorizeSegResp.segmentTypes)
    })
  }, [textSegments])

  function onKeyUpDocument(event: KeyboardEvent) {
    if (event.code == 'KeyQ') {
      // Split the current segment into two segments based on the cursor position
      if (selectedSegmentNode != null && selectedSegmentOffset != null) {
        const segmentText = textSegments[selectedSegmentIndex!]

        if (segmentText.length <= 1) {
          // Nothing to split
          return
        }

        const firstSegmentText = segmentText.substring(0, selectedSegmentOffset)
        if (firstSegmentText.length == 0) {
          // Nothing to split
          return
        }

        const secondSegmentText = segmentText.substring(selectedSegmentOffset)

        const newSegments = [...textSegments]
        newSegments.splice(selectedSegmentIndex!, 1, firstSegmentText, secondSegmentText)
        setTextSegments(newSegments)
      }
    } else if (event.code == 'KeyW') {
      // Join the selected segments together
      const selection = window.getSelection()
      if (selection == null) {
        return
      }
      const range = selection.getRangeAt(0)
      const startNode = range.startContainer
      const endNode = range.endContainer
      if (startNode == null || endNode == null) {
        return
      }

      const startSegmentIndex = parseInt(startNode.parentElement?.getAttribute('data-segment-index')!)
      const endSegmentIndex = parseInt(endNode.parentElement?.getAttribute('data-segment-index')!)
      if (startSegmentIndex == null || endSegmentIndex == null || Number.isNaN(startSegmentIndex) || Number.isNaN(endSegmentIndex) || startSegmentIndex == endSegmentIndex) {
        return
      }

      // Only allow to join up to three segments
      if (endSegmentIndex - startSegmentIndex > 2) {
        return
      }

      const newSegments = [...textSegments]
      let joinedSegmentText = ""
      for (let i = startSegmentIndex; i <= endSegmentIndex; i++) {
        joinedSegmentText += newSegments[i]
      }

      if (joinedSegmentText.length == 0) {
        return
      }

      newSegments.splice(startSegmentIndex, endSegmentIndex - startSegmentIndex + 1, joinedSegmentText)
      setTextSegments(newSegments)
    }
  }

  function onMouseMoveSegmentList(event: React.MouseEvent<HTMLDivElement>) {
    const range = document.caretRangeFromPoint(event.clientX, event.clientY)
    if (range == null || range.startContainer == null || range.startOffset == null) {
      return;
    }

    const node = range!.startContainer
    // Check if the node has an attribute data-segment-index
    const segmentIndex = node.parentElement?.getAttribute('data-segment-index')
    if (segmentIndex != null) {
      setSelectedSegmentNode(node)
      setSelectedSegmentOffset(range!.startOffset)
      setSelectedSegmentIndex(parseInt(segmentIndex))
    }
  }

  function onMouseMoveDocument(event: MouseEvent) {
    // Search the dictionary
    const [wordUnderCursor, nodeUnderCursor] = getWordUnderCursor(event)
    if (wordUnderCursor == "" || nodeUnderCursor == null) {
      return
    }

    // console.log(`Word under cursor: ${wordUnderCursor} - Node: ${node}`)
    const request: SearchTermRequest = { type: RequestType.SearchTerm, searchTerm: wordUnderCursor }

    chrome.runtime.sendMessage(request)
      .then((response: SearchTermResponse) => {
        if (response != null) {
          setSearchTermResponse(response)
        }
      })
    }

  useEffect(() => {
    document.addEventListener("keyup", onKeyUpDocument);
    document.addEventListener("mousemove", onMouseMoveDocument);
    return () => {
      document.removeEventListener("keyup", onKeyUpDocument);
      document.removeEventListener("mousemove", onMouseMoveDocument);
    };
  }, [onKeyUpDocument, onMouseMoveDocument]);

  function getTextView() {
    if (text == null) {
      return <p>No text selected.</p>;
    } else if (segmentsLoadingStatus === ResourceLoadStatus.Loading) {
      return <p>Loading...</p>;
    } else {
      return <div className="segment-list" onMouseMove={onMouseMoveSegmentList}>
        {textSegments.map((segment, index) => {
          let segmentType = SegmentType.Ignored

          // Only when the segment types are loaded
          if (textSegmentTypes.length == textSegments.length) {
            segmentType = textSegmentTypes[index]
          }

          let segmentClass = "segment "
          if (segmentType == SegmentType.Ignored) {
            segmentClass += "segment-ignored"
          } else if (segmentType == SegmentType.Unknown) {
            segmentClass += "segment-unknown"
          } else if (segmentType == SegmentType.Known) {
            segmentClass += "segment-known"
          }

          return <span data-segment-index={index} className={segmentClass} key={index}>{segment}</span>
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
          <ResultsViewer response={searchTermResponse} />
        </div>
      </div>
    </Container>
  );
};

export default Reader;
