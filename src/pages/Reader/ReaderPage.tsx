import React, { useEffect, useRef, useState } from 'react';

import { Col, Container, Row } from 'react-bootstrap'
import { AddKnownWordRequest, DUMMY_CONTENT, GetUserTextRequest, GetUserTextResponse, RemoveKnownWordRequest, RequestType, SearchTermRequest, SearchTermResponse, UpdateUserTextRequest, } from '../../shared/messages'
import { ResourceLoadStatus } from '../../shared/loading';

import 'bootstrap/dist/css/bootstrap.min.css'
import './ReaderPage.scss';
import { ResultsViewer } from './ResultsViewer';
import { getWordUnderCursor } from '../Content/textSelect';
import { SegmentType } from '../../shared/chineseUtils';
import { UserText } from '../../shared/userTexts';

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

  const searchParams = new URLSearchParams(window.location.search);

  const [userTextId, setUserTextId] = useState<string | null>(null);
  const [userTextLoadingStatus, setUserTextLoadingStatus] = useState(ResourceLoadStatus.Unloaded);
  const [userText, setUserText] = useState<UserText | null>(null);

  const [selectedSegmentNode, setSelectedSegmentNode] = useState<Node | null>(null);
  const [selectedSegmentOffset, setSelectedSegmentOffset] = useState<number | null>(null);
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number | null>(null);

  const [searchTermResponse, setSearchTermResponse] = useState<SearchTermResponse>(EMPTY_RESULTS);

  useEffect(() => {
    // Get the user text id from the url
    const id = searchParams.get('id')
    if (id == null) {
      return
    }
    setUserTextId(id)
  }, [])

  useEffect(() => {
    if (userTextId == null) {
      return
    }
    console.log(`Loading user text ${userTextId}`)
    // Retrieve the user text from its id
    const request: GetUserTextRequest = { type: RequestType.GetUserText, id: userTextId! }
    chrome.runtime.sendMessage(request, (response) => {
      const getUserTextResponse: GetUserTextResponse = response as GetUserTextResponse
      if (getUserTextResponse.userText != null) {
        setUserText(getUserTextResponse.userText)
        setUserTextLoadingStatus(ResourceLoadStatus.Loaded);
      }
    })
  }, [userTextId])

  function saveUserText() {
    // Save the user text
    const request: UpdateUserTextRequest = { type: RequestType.UpdateUserText, userText: userText! }
    chrome.runtime.sendMessage(request, (response) => {
      // Do nothing with the response
    })
  }

  function setAsKnownWord(word: string) {
    const request: AddKnownWordRequest = { type: RequestType.AddKnownWord, word: word }
    chrome.runtime.sendMessage(request, (response) => {
      // Do nothing with the response
    })

    // Update the segment type
    const newSegmentTypes = [...userText!.segmentTypes]
    newSegmentTypes[selectedSegmentIndex!] = SegmentType.Known
    setUserText({ ...userText!, segmentTypes: newSegmentTypes })
  }

  function setAsUnknownWord(word: string) {
    const request: RemoveKnownWordRequest = { type: RequestType.RemoveKnownWord, word: word }
    chrome.runtime.sendMessage(request, (response) => {
      // Do nothing with the response
    })

    // Update the segment type
    const newSegmentTypes = [...userText!.segmentTypes]
    newSegmentTypes[selectedSegmentIndex!] = SegmentType.Unknown
    setUserText({ ...userText!, segmentTypes: newSegmentTypes }) 
  }

  function onKeyUpDocument(event: KeyboardEvent) {
    if (event.code == 'KeyQ') {
      // Split the current segment into two segments based on the cursor position
      if (selectedSegmentNode != null && selectedSegmentNode != null && selectedSegmentOffset != null) {
        const segmentText = userText!.segments[selectedSegmentIndex!]

        // Do not split if only composed of one character
        if (segmentText.length <= 1) {
          return
        }

        // Do not split if the cursor is at the beginning of the segment or at the end
        const firstSegmentText = segmentText.substring(0, selectedSegmentOffset)
        if (firstSegmentText.length == 0 || firstSegmentText.length == segmentText.length) {
          return
        }

        // Split and save
        const secondSegmentText = segmentText.substring(selectedSegmentOffset)
        const newSegments = [...userText!.segments]
        newSegments.splice(selectedSegmentIndex!, 1, firstSegmentText, secondSegmentText)
        setUserText({ ...userText!, segments: newSegments })
        saveUserText()
      }
    } else if (event.code == 'KeyW') {
      // Join the selected segments together
      const selection = window.getSelection()

      if (selection == null || selection.rangeCount == 0) {
        // No selection
        return
      }

      const range = selection.getRangeAt(0)
      const startNode = range.startContainer
      const endNode = range.endContainer

      if (startNode == null || endNode == null) {
        // Invalid selection
        return
      }

      const startSegmentIndex = parseInt(startNode.parentElement?.getAttribute('data-segment-index')!)
      const endSegmentIndex = parseInt(endNode.parentElement?.getAttribute('data-segment-index')!)
      if (startSegmentIndex == null || endSegmentIndex == null || Number.isNaN(startSegmentIndex) || Number.isNaN(endSegmentIndex) || startSegmentIndex == endSegmentIndex) {
        // Invalid selection
        return
      }

      if (endSegmentIndex - startSegmentIndex > 2) {
        // Only allow to join up to three segments
        return
      }


      const newSegments = [...userText!.segments]
      let joinedSegmentText = ""
      for (let i = startSegmentIndex; i <= endSegmentIndex; i++) {
        // Create the new segment text
        joinedSegmentText += newSegments[i]
      }

      if (joinedSegmentText.length == 0) {
        // Invalid selection
        return
      }

      // Delete the old segments, insert the joined one and save
      newSegments.splice(startSegmentIndex, endSegmentIndex - startSegmentIndex + 1, joinedSegmentText)
      setUserText({ ...userText!, segments: newSegments })
      saveUserText()
    } else if (event.code == 'Digit1') {
      if (selectedSegmentNode != null && selectedSegmentIndex != null) {
        // Mark the selected segment as ignored
        const segmentText = userText!.segments[selectedSegmentIndex!]
        setAsUnknownWord(segmentText)
      }
    } else if (event.code == 'Digit2') {
      if (selectedSegmentNode != null && selectedSegmentIndex != null) {
        // Mark the selected segment as a known word
        const segmentText = userText!.segments[selectedSegmentIndex!]
        setAsKnownWord(segmentText)
      }
    }
  }

  function onMouseMoveSegmentList(event: React.MouseEvent<HTMLDivElement>) {
    // Always reset the selection
    setSelectedSegmentNode(null)
    setSelectedSegmentOffset(null)
    setSelectedSegmentIndex(null)

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

    const request: SearchTermRequest = { type: RequestType.SearchTerm, searchTerm: wordUnderCursor, ignoreDisabledStatus: true }

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
    if (userTextId == null) {
      return <p>No text selected.</p>;
    } else if (userTextLoadingStatus != ResourceLoadStatus.Loaded) {
      return <p>Loading...</p>;
    } else {
      return <div className="segment-list" onMouseMove={onMouseMoveSegmentList}>
        {userText!.segments.map((segment, index) => {
          let segmentType = userText!.segmentTypes[index]

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
