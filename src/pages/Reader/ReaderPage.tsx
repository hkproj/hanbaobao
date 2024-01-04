import React, { useEffect, useRef, useState } from 'react';

import { Button, Col, Container, FormControl, Row } from 'react-bootstrap'
import { AddKnownWordRequest, DUMMY_CONTENT, GetUserTextRequest, GetUserTextResponse, RemoveKnownWordRequest, RequestType, SearchTermRequest, SearchTermResponse, UpdateUserTextRequest, } from '../../shared/messages'
import { ResourceLoadStatus } from '../../shared/loading';

import 'bootstrap/dist/css/bootstrap.min.css'
import './ReaderPage.scss';
import { ResultsViewer } from './ResultsViewer';
import { getWordUnderCursor } from '../Content/textSelect';
import { SegmentType } from '../../shared/chineseUtils';
import { TextSegment, UserText } from '../../shared/userTexts';

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

  const [isInTitleEditMode, setIsInTitleEditMode] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    // Get the user text id from the url
    const id = searchParams.get('id')
    if (id == null) {
      console.error("No user text id provided")
      return
    }
    setUserTextId(id)
  }, [])

  useEffect(() => {
    // Load the user text given its id
    if (userTextId == null) {
      return
    }
    reloadUserText().catch((error) => {
      console.error(error)
    })
  }, [userTextId])

  async function reloadUserText() {
    setUserTextLoadingStatus(ResourceLoadStatus.Loading);
    console.log(`Loading user text ${userTextId}`)
    // Retrieve the user text from its id
    const request: GetUserTextRequest = { type: RequestType.GetUserText, id: userTextId! }
    const response = await chrome.runtime.sendMessage(request)
    const getUserTextResponse: GetUserTextResponse = response as GetUserTextResponse
    if (getUserTextResponse.userText != null) {
      setUserText(getUserTextResponse.userText)
      setUserTextLoadingStatus(ResourceLoadStatus.Loaded);
    }
  }

  async function saveUserText(newUserText: UserText): Promise<void> {
    // Save the user text
    const request: UpdateUserTextRequest = { type: RequestType.UpdateUserText, userText: newUserText }
    return await chrome.runtime.sendMessage(request)
  }

  async function updateSegments(newSegments: Array<TextSegment>) {
    const newUserText = { ...userText!, segments: newSegments }
    await saveUserText(newUserText)
    await reloadUserText()
  }

  async function setAsKnownWord(segmentIndex: number) {
    const request: AddKnownWordRequest = { type: RequestType.AddKnownWord, word: userText!.segments[segmentIndex].text }
    await chrome.runtime.sendMessage(request)

    // Update the segment type
    const newSegments = [...userText!.segments]
    newSegments[segmentIndex].type = SegmentType.Known
    const newUserText: UserText = { ...userText!, segments: newSegments }
    await saveUserText(newUserText)

    // Reload the user text to update the known words
    await reloadUserText()
  }

  async function setAsUnknownWord(segmentIndex: number) {
    const request: RemoveKnownWordRequest = { type: RequestType.RemoveKnownWord, word: userText!.segments[segmentIndex].text }
    await chrome.runtime.sendMessage(request)

    // Update the segment type
    const newSegments = [...userText!.segments]
    newSegments[segmentIndex].type = SegmentType.Unknown
    const newUserText: UserText = { ...userText!, segments: newSegments }
    await saveUserText(newUserText)

    // Reload the user text to update the known words
    await reloadUserText()
  }

  function onKeyUpDocument(event: KeyboardEvent) {
    if (event.code == 'KeyQ') {
      // Split the current segment into two segments based on the cursor position
      if (selectedSegmentNode != null && selectedSegmentNode != null && selectedSegmentOffset != null) {
        const segmentText = userText!.segments[selectedSegmentIndex!].text;

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

        const newFirstSegment: TextSegment = {
          text: firstSegmentText,
          type: SegmentType.Unknown
        }

        const newSecondSegment = {
          text: secondSegmentText,
          type: SegmentType.Unknown
        }

        newSegments.splice(selectedSegmentIndex!, 1, newFirstSegment, newSecondSegment)
        updateSegments(newSegments).catch((error) => { console.error(error) })
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
        joinedSegmentText += newSegments[i].text
      }

      if (joinedSegmentText.length == 0) {
        // Invalid selection
        return
      }

      const segmentToAdd: TextSegment = {
        text: joinedSegmentText,
        type: SegmentType.Unknown
      } 

      // Delete the old segments, insert the joined one and save
      newSegments.splice(startSegmentIndex, endSegmentIndex - startSegmentIndex + 1, segmentToAdd)
      updateSegments(newSegments).catch((error) => { console.error(error) })
    } else if (event.code == 'Digit1') {
      if (selectedSegmentNode != null && selectedSegmentIndex != null) {
        // Mark the selected segment as ignored
        setAsUnknownWord(selectedSegmentIndex).catch((error) => { console.error(error) })
      }
    } else if (event.code == 'Digit2') {
      if (selectedSegmentNode != null && selectedSegmentIndex != null) {
        // Mark the selected segment as a known word
        setAsKnownWord(selectedSegmentIndex).catch((error) => { console.error(error) })
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
          let segmentType = segment.type

          let segmentClass = "segment "
          if (segmentType == SegmentType.Ignored) {
            segmentClass += "segment-ignored"
          } else if (segmentType == SegmentType.Unknown) {
            segmentClass += "segment-unknown"
          } else if (segmentType == SegmentType.Known) {
            segmentClass += "segment-known"
          }

          return <span data-segment-index={index} className={segmentClass} key={index}>{segment.text}</span>
        })}
      </div>
    }
  }

  function saveNewTitle() {
    const newUserText = { ...userText!, name: newTitle }
    saveUserText(newUserText).then(() => {
      setIsInTitleEditMode(false)
      reloadUserText().catch((error) => { console.error(error) })
    }).catch((error) => { console.error(error) })
  }

  function enterEditMode() {
    setNewTitle(userText!.name)
    setIsInTitleEditMode(true)
  }

  function getTitleView() {
    if (userTextId == null || userTextLoadingStatus != ResourceLoadStatus.Loaded) {
      return null;
    } else {
      if (isInTitleEditMode) {
        return <>
          <div className='col-2 my-auto my-auto'>
            <Button className="m-1" variant="success" onClick={() => saveNewTitle()}>Save</Button>
            <Button className="m-1" variant="danger" onClick={() => { setIsInTitleEditMode(false) }}>Cancel</Button>
          </div>
          <div className='col-10'>
            <FormControl
              type="text"
              className='m-1 fs-1'
              value={newTitle}
              onChange={(event) => { setNewTitle(event.target.value) }}
            />
          </div>
        </>
      } else {
        return <>
          <div className='col-2 my-auto'>
            <Button className="m-1" variant="primary" onClick={() => { enterEditMode() }}>Edit</Button>
          </div>
          <div className='col-10 my-auto'>
            <span className='m-1 fs-1'>{userText!.name}</span>
          </div>
        </>
      }
    }
  }

  return (
    <Container fluid={true}>
      <div className='row align-center'>
        {getTitleView()}
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
