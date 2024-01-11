import React, { useEffect, useState } from 'react';

import { Button, Card, Container, NavLink, Modal, CardHeader } from 'react-bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'

import moment from 'moment';

import './UserTextsListPage.scss';
import { UserText } from '../../shared/userTexts';
import { ResourceLoadStatus } from '../../shared/loading';
import { DeleteUserTextRequest, DeleteUserTextResponse, GetUserTextsListRequest, GetUserTextsListResponse, RequestType } from '../../shared/messages';

const UserTextsListPage = () => {

  const [userTextsList, setUserTextsList] = useState<Array<UserText> | null>(null);
  const [userTextsListLoadingStatus, setuserTextsListLoadingStatus] = useState(ResourceLoadStatus.Unloaded);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userTextToDelete, setUserTextToDelete] = useState<UserText | null>(null);

  async function reloadUserTextsList() {
    const request: GetUserTextsListRequest = { type: RequestType.GetUserTextsList }
    const response = await chrome.runtime.sendMessage(request)
    const getUserTextResponse: GetUserTextsListResponse = response as GetUserTextsListResponse
    setUserTextsList(getUserTextResponse.userTexts)
    setuserTextsListLoadingStatus(ResourceLoadStatus.Loaded)
  }

  useEffect(() => {
    // Fetch user texts list
    reloadUserTextsList().catch((error) => { console.error(error) })
  }, []);

  function handleShowDeleteConfirmation(userText: UserText) {
    setUserTextToDelete(userText)
    setShowDeleteModal(true)
  }

  async function handleDeleteOperation() {
    if (userTextToDelete == null) {
      console.error('User text to delete is null')
      return
    }

    const deleteRequest: DeleteUserTextRequest = { type: RequestType.DeleteUserText, id: userTextToDelete.id }
    const deleteResponse = (await chrome.runtime.sendMessage(deleteRequest)) as DeleteUserTextResponse

    await reloadUserTextsList()
    setUserTextToDelete(null)
    setShowDeleteModal(false)
  }

  function handleCloseDeleteModal() {
    setShowDeleteModal(false)
    setUserTextToDelete(null)
  }

  function getUserTextsListView() {
    if (userTextsListLoadingStatus != ResourceLoadStatus.Loaded) {
      return (
        <div className='row align-center'>
          <h1>Loading...</h1>
        </div>
      )
    } else {
      return userTextsList?.map((userText) => {

        const createdOn = new Date(userText.createdOn)


        return (
          <Card className='m-2 p-2' style={{ width: "25rem" }}>
            <Card.Body>
              <Card.Title>
                <NavLink href={`reader.html?id=${userText.id}`}>{userText.name}</NavLink>
              </Card.Title>
              <Card.Text>
                Created on {moment(createdOn).format('MMMM Do YYYY, HH:mm')}
              </Card.Text>
              <Button className='m-3' variant='danger' onClick={() => { handleShowDeleteConfirmation(userText) }}>Delete</Button>
            </Card.Body>
          </Card >
        )
      })
    }
  }

  return (
    <>
      <Modal show={showDeleteModal} onHide={handleCloseDeleteModal}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm delete?</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to delete the user text <strong>{userTextToDelete?.name}</strong>?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDeleteModal}>Close</Button>
          <Button variant="danger" onClick={() => handleDeleteOperation().catch((error) => console.error(error))}>Proceed</Button>
        </Modal.Footer>
      </Modal>
      <Container fluid={true}>
        <div className='row align-center'>
          <h1>🗃️ - List of saved texts</h1>
        </div>
        <div className="d-flex flex-row flex-wrap">
          {getUserTextsListView()}
        </div>
      </Container>
    </>

  );
};

export default UserTextsListPage;