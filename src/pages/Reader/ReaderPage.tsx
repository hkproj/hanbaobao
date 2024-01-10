import React, { useEffect, useState } from 'react';

import { Button, Container, FormControl, Modal, Form } from 'react-bootstrap'
import { AddKnownWordRequest, DUMMY_CONTENT, GetUserTextRequest, GetUserTextResponse, JoinSegmentsInUserTextRequest, RemoveKnownWordRequest, RequestType, SearchTermRequest, SearchTermResponse, SplitSegmentsInUserTextRequest, UpdateUserTextRequest, } from '../../shared/messages'
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

enum SegmentGlobalOperationType {
  CurrentUserText = 1,
  AllUserTexts = 2
}

const JOIN_SEGMENT_KEY = 'KeyX'
const JOIN_SEGMENT_GLOBALLY_KEY = 'KeyM'

const SPLIT_SEGMENT_KEY = 'KeyZ'
const SPLIT_SEGMENT_GLOBALLY_KEY = 'KeyN'

const SET_KNOWN_WORD_KEY = 'Digit2'
const SET_UNKNOWN_WORD_KEY = 'Digit1'

const ALL_USER_TEXTS_LABEL = '🗃️ - All saved texts'
const CURRENT_TEXT_LABEL = '📖 - Current text'

const Reader = () => {

  const searchParams = new URLSearchParams(window.location.search);

  const [userTextId, setUserTextId] = useState<string | null>(null);
  const [userTextLoadingStatus, setUserTextLoadingStatus] = useState(ResourceLoadStatus.Unloaded);
  const [userText, setUserText] = useState<UserText | null>(null);

  // Capture segment under the mouse
  const [hoverSegmentNode, setSelectedSegmentNode] = useState<Node | null>(null);
  // Indicates the position of the mouse inside the string
  const [hoverSegmentOffset, setSelectedSegmentOffset] = useState<number | null>(null);
  // Indicates the index of the segment under the mouse
  const [hoverSegmentIndex, setSelectedSegmentIndex] = useState<number | null>(null);

  // Join segments modal
  const [joinSegmentGlobalModal, setJoinSegmentGlobalModal] = useState(false);
  const [joinSegmentGlobalType, setJoinSegmentGlobalType] = useState<SegmentGlobalOperationType>(SegmentGlobalOperationType.CurrentUserText);
  const [joinSegmentGlobalStartIndex, setJoinSegmentGlobalStartIndex] = useState<number | null>(null);
  const [joinSegmentGlobalEndIndex, setJoinSegmentGlobalEndIndex] = useState<number | null>(null);

  // Split segments modal
  const [splitSegmentGlobalModal, setSplitSegmentGlobalModal] = useState(false);
  const [splitSegmentGlobalType, setSplitSegmentGlobalType] = useState<SegmentGlobalOperationType>(SegmentGlobalOperationType.CurrentUserText);
  const [splitSegmentGlobalSegmentIndex, setSplitSegmentGlobalSegmentIndex] = useState<number | null>(null);
  const [splitSegmentGlobalSplitIndex, setSplitSegmentGlobalSplitIndex] = useState<number | null>(null);

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
    // Reset selection
    setSelectedSegmentNode(null)
    setSelectedSegmentOffset(null)
    setSelectedSegmentIndex(null)

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

  async function splitSegments(segmentIndex: number, splitIndex: number, globalOperationType: SegmentGlobalOperationType | null = null) {
    const request: SplitSegmentsInUserTextRequest = {
      type: RequestType.SplitSegmentsInUserText,
      segmentIndex: segmentIndex,
      splitIndex: splitIndex,
      updateAllOccurrencesInAllUserTexts: false,
      updateAllOccurrencesInCurrentTextUser: false,
      userTextId: userTextId!
    }

    if (globalOperationType != null) {
      if (globalOperationType == SegmentGlobalOperationType.CurrentUserText) {
        request.updateAllOccurrencesInCurrentTextUser = true
      } else if (globalOperationType == SegmentGlobalOperationType.AllUserTexts) {
        request.updateAllOccurrencesInAllUserTexts = true
      }
    }

    await chrome.runtime.sendMessage(request)

    // Reload the user text
    await reloadUserText()
  }

  async function joinSegments(startSegmentIndex: number, endSegmentIndex: number, globalOperationType: SegmentGlobalOperationType | null = null) {
    const request: JoinSegmentsInUserTextRequest = {
      type: RequestType.JoinSegmentsInUserText,
      startSegmentIndex: startSegmentIndex,
      endSegmentIndex: endSegmentIndex,
      updateAllOccurrencesInAllUserTexts: false,
      updateAllOccurrencesInCurrentTextUser: false,
      userTextId: userTextId!
    }

    if (globalOperationType != null) {
      if (globalOperationType == SegmentGlobalOperationType.CurrentUserText) {
        request.updateAllOccurrencesInCurrentTextUser = true
      } else if (globalOperationType == SegmentGlobalOperationType.AllUserTexts) {
        request.updateAllOccurrencesInAllUserTexts = true
      }
    }

    await chrome.runtime.sendMessage(request)

    // Reload the user text
    await reloadUserText()
  }

  async function setAsKnownWord(segmentIndex: number) {
    const request: AddKnownWordRequest = { type: RequestType.AddKnownWord, word: userText!.segments[segmentIndex].text }
    await chrome.runtime.sendMessage(request)

    // Reload the user text to update the known words
    await reloadUserText()
  }

  async function setAsUnknownWord(segmentIndex: number) {
    const request: RemoveKnownWordRequest = { type: RequestType.RemoveKnownWord, word: userText!.segments[segmentIndex].text }
    await chrome.runtime.sendMessage(request)

    // Reload the user text to update the known words
    await reloadUserText()
  }

  function onKeyUpDocument(event: KeyboardEvent) {
    if (event.code == SPLIT_SEGMENT_KEY || event.code == SPLIT_SEGMENT_GLOBALLY_KEY) {
      // Split the current segment into two segments based on the cursor position
      if (hoverSegmentNode != null && hoverSegmentNode != null && hoverSegmentOffset != null) {
        const segmentText = userText!.segments[hoverSegmentIndex!].text;

        // Do not split if only composed of one character
        if (segmentText.length <= 1) {
          return
        }

        // Do not split if the cursor is at the beginning of the segment or at the end
        const firstSegmentText = segmentText.substring(0, hoverSegmentOffset)
        if (firstSegmentText.length == 0 || firstSegmentText.length == segmentText.length) {
          return
        }

        if (event.code == SPLIT_SEGMENT_GLOBALLY_KEY) {
          // Ask the user where to split the segment
          setSplitSegmentGlobalSegmentIndex(hoverSegmentIndex)
          setSplitSegmentGlobalSplitIndex(hoverSegmentOffset)
          setSplitSegmentGlobalModal(true)
        } else {
          // Split the segment
          splitSegments(hoverSegmentIndex!, hoverSegmentOffset!, null).catch((error) => { console.error(error) })
        }
      }
    } else if (event.code == JOIN_SEGMENT_KEY || event.code == JOIN_SEGMENT_GLOBALLY_KEY) {
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

      if (event.code == JOIN_SEGMENT_GLOBALLY_KEY) {
        // Ask the user where to join the segments
        setJoinSegmentGlobalStartIndex(startSegmentIndex)
        setJoinSegmentGlobalEndIndex(endSegmentIndex)
        setJoinSegmentGlobalModal(true)
      } else if (event.code == JOIN_SEGMENT_KEY) {
        // Join the segments
        joinSegments(startSegmentIndex, endSegmentIndex, null).catch((error) => { console.error(error) })
      }
    } else if (event.code == SET_UNKNOWN_WORD_KEY) {
      if (hoverSegmentNode != null && hoverSegmentIndex != null) {
        // Mark the selected segment as ignored
        setAsUnknownWord(hoverSegmentIndex).catch((error) => { console.error(error) })
      }
    } else if (event.code == SET_KNOWN_WORD_KEY) {
      if (hoverSegmentNode != null && hoverSegmentIndex != null) {
        // Mark the selected segment as a known word
        setAsKnownWord(hoverSegmentIndex).catch((error) => { console.error(error) })
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

  function handleCloseJoinSegmentGlobalModal() {
    setJoinSegmentGlobalModal(false)
    setJoinSegmentGlobalType(SegmentGlobalOperationType.CurrentUserText)
    setJoinSegmentGlobalStartIndex(null)
    setJoinSegmentGlobalEndIndex(null)
  }

  function handleCloseSplitSegmentGlobalModal() {
    setSplitSegmentGlobalModal(false)
    setSplitSegmentGlobalType(SegmentGlobalOperationType.CurrentUserText)
    setSplitSegmentGlobalSegmentIndex(null)
    setSplitSegmentGlobalSplitIndex(null)
  }

  function getSelectedJoinSegmentsText() {
    if (joinSegmentGlobalStartIndex == null || joinSegmentGlobalEndIndex == null) {
      throw new Error('Invalid join segment (global) indexes')
    }

    let selectedSegmentsText = ""
    for (let i = joinSegmentGlobalStartIndex; i <= joinSegmentGlobalEndIndex; i++) {
      selectedSegmentsText += userText!.segments[i].text
    }
    return (<p>
      Selected text: <strong>{selectedSegmentsText}</strong>
    </p>)
  }

  async function handleJoinSegmentsGlobal() {
    if (joinSegmentGlobalStartIndex == null || joinSegmentGlobalEndIndex == null) {
      throw new Error('Invalid join segment (global) indexes')
    }

    setJoinSegmentGlobalModal(false)
    setJoinSegmentGlobalType(SegmentGlobalOperationType.CurrentUserText)
    setJoinSegmentGlobalStartIndex(null)
    setJoinSegmentGlobalEndIndex(null)
    await joinSegments(joinSegmentGlobalStartIndex!, joinSegmentGlobalEndIndex!, joinSegmentGlobalType)
  }

  async function handleSplitSegmentsGlobal() {
    if (splitSegmentGlobalSegmentIndex == null || splitSegmentGlobalSplitIndex == null) {
      throw new Error('Invalid split segment (global) indexes')
    }

    setSplitSegmentGlobalModal(false)
    setSplitSegmentGlobalType(SegmentGlobalOperationType.CurrentUserText)
    setSplitSegmentGlobalSegmentIndex(null)
    setSplitSegmentGlobalSplitIndex(null)
    await splitSegments(splitSegmentGlobalSegmentIndex!, splitSegmentGlobalSplitIndex!, splitSegmentGlobalType)
  }

  function getSelectedSplitSegmentText() {
    if (splitSegmentGlobalSegmentIndex == null || splitSegmentGlobalSplitIndex == null) {
      throw new Error('Invalid split segment (global) indexes')
    }

    const originalText = userText!.segments[splitSegmentGlobalSegmentIndex!].text
    const newSeg1 = originalText.substring(0, splitSegmentGlobalSplitIndex!)
    const newSeg2 = originalText.substring(splitSegmentGlobalSplitIndex!)

    return (<p>
      Word 1: <strong>{newSeg1}</strong><br />
      Word 2: <strong>{newSeg2}</strong>
    </p>)
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

  return (
    <>
      <Modal show={joinSegmentGlobalModal} onHide={handleCloseJoinSegmentGlobalModal}>
        <Modal.Header closeButton>
          <Modal.Title>Where else do you want to join the two words?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {joinSegmentGlobalModal && getSelectedJoinSegmentsText()}
          <Form>
            <Form.Check
              type={'radio'}
              id={'jointype-current'}
              label={'Current text'}
              checked={joinSegmentGlobalType == SegmentGlobalOperationType.CurrentUserText}
              onClick={() => setJoinSegmentGlobalType(SegmentGlobalOperationType.CurrentUserText)}
            />
            <Form.Check
              type={'radio'}
              id={'jointype-all'}
              label={'All saved texts'}
              checked={joinSegmentGlobalType == SegmentGlobalOperationType.AllUserTexts}
              onClick={() => setJoinSegmentGlobalType(SegmentGlobalOperationType.AllUserTexts)}
            />
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseJoinSegmentGlobalModal}>Cancel</Button>
          <Button variant="primary" onClick={() => handleJoinSegmentsGlobal().catch((error) => console.error(error))}>Join</Button>
        </Modal.Footer>
      </Modal>
      <Modal show={splitSegmentGlobalModal} onHide={handleCloseSplitSegmentGlobalModal}>
        <Modal.Header closeButton>
          <Modal.Title>Where else do you want to split the selected word?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {splitSegmentGlobalModal && getSelectedSplitSegmentText()}
          <Form>
            <Form.Check
              type={'radio'}
              id={'splittype-current'}
              label={'Current text'}
              checked={splitSegmentGlobalType == SegmentGlobalOperationType.CurrentUserText}
              onClick={() => setSplitSegmentGlobalType(SegmentGlobalOperationType.CurrentUserText)}
            />
            <Form.Check
              type={'radio'}
              id={'splittype-all'}
              label={'All saved texts'}
              checked={splitSegmentGlobalType == SegmentGlobalOperationType.AllUserTexts}
              onClick={() => setSplitSegmentGlobalType(SegmentGlobalOperationType.AllUserTexts)}
            />
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseSplitSegmentGlobalModal}>Cancel</Button>
          <Button variant="primary" onClick={() => handleSplitSegmentsGlobal().catch((error) => console.error(error))}>Split</Button>
        </Modal.Footer>
      </Modal>
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
    </>

  );
};

export default Reader;
