import React, { useEffect, useRef, useState } from 'react';

import { Card, Col, Container, NavLink, Row } from 'react-bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'

import moment from 'moment';

import './UserTextsListPage.scss';
import { UserText } from '../../shared/userTexts';
import { ResourceLoadStatus } from '../../shared/loading';
import { GetUserTextsListRequest, GetUserTextsListResponse, RequestType } from '../../shared/messages';

const UserTextsListPage = () => {

  const [userTextsList, setUserTextsList] = useState<Array<UserText> | null>(null);
  const [userTextsListLoadingStatus, setuserTextsListLoadingStatus] = useState(ResourceLoadStatus.Unloaded);

  async function reloadUserTextsList() {
    const request: GetUserTextsListRequest = { type: RequestType.GetUserTextsList }
    const response = await chrome.runtime.sendMessage(request)
    const getUserTextResponse: GetUserTextsListResponse = response as GetUserTextsListResponse
    setUserTextsList(getUserTextResponse.userTexts)
    setuserTextsListLoadingStatus(ResourceLoadStatus.Loaded)
  }

  useEffect(() => {
    // Fetch user texts list
    reloadUserTextsList().catch((error) => { console.log(error) })
  }, []);

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
          <Card>
            <Card.Body>
              <Card.Title>
                <NavLink href={`reader.html?id=${userText.id}`}>
                  {userText.name}
                </NavLink>
              </Card.Title>
              Created on {moment(createdOn).format('MMMM Do YYYY, HH:mm')}
            </Card.Body>
          </Card>
        )
      })
    }

  }

  return (
    <Container fluid={true}>
      <div className='row align-center'>
        <h1>List of saved texts</h1>
      </div>
      <div className="row">
        {getUserTextsListView()}
      </div>
    </Container>
  );
};

export default UserTextsListPage;
