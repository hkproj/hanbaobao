import * as messages from '../../shared/messages'
import { ResourceLoadStatus } from "../../shared/loading";
import { AppState } from './state';
import { TextSegment, UserText, addUserText as generateIdAndAddUserText, segmentAndCategorizeText, updateSegmentTypesForAllUserTexts } from "../../shared/userTexts";
import * as chinese from "../../shared/chineseUtils";
import * as jieba from "../../shared/jieba";
import * as state from "./state";

export async function handleAddNewUserTextRequest(appState: AppState, addNewUserTextRequest: messages.AddNewUserTextRequest) {
    const addNewUserTextResponse: messages.AddNewUserTextResponse = { dummy: messages.DUMMY_CONTENT, id: null }

    if (appState.userTextsLoadStatus != ResourceLoadStatus.Loaded || appState.jiebaLoadStatus != ResourceLoadStatus.Loaded || appState.knownWordsLoadStatus != ResourceLoadStatus.Loaded) {
        return addNewUserTextResponse
    }

    const segments = segmentAndCategorizeText(addNewUserTextRequest.text, appState)

    const userTextToAdd: UserText = {
        id: "", // It will be assigned a new unique id
        name: "New user text",
        url: addNewUserTextRequest.url,
        segments: segments,
        createdOn: new Date().toISOString(),
    }

    const [newUserText, newUserTextsIndex] = await generateIdAndAddUserText(appState.userTextsIndex!, userTextToAdd)

    // Save the new user text and the list
    addNewUserTextResponse.id = newUserText.id
    appState.userTextsIndex = newUserTextsIndex
    state.saveUserTexts(appState)

    return addNewUserTextResponse
}

export function handleSearchTermRequest(appState: AppState, request: messages.SearchTermRequest): messages.SearchTermResponse {
    const searchTermRequest = request as messages.SearchTermRequest
    const searchResponse: messages.SearchTermResponse = {
        dummy: messages.DUMMY_CONTENT,
        dictionary: { data: [], maxMatchLen: 0 },
        hsk: [],
        knownWords: [],
        status: appState.dictionaryLoadStatus,
        serviceEnabled: appState.searchServiceEnabled
    }

    if (appState.dictionaryLoadStatus != ResourceLoadStatus.Loaded || (!appState.searchServiceEnabled && !searchTermRequest.ignoreDisabledStatus)) {
        return searchResponse
    }

    if (appState.knownWordsLoadStatus != ResourceLoadStatus.Loaded || (!appState.knownWordsEnabled && !searchTermRequest.ignoreDisabledStatus)) {
        return searchResponse
    }

    const word = searchTermRequest.searchTerm
    const dictionaryResults = chinese.searchWordInChineseDictionary(word, appState.dictionaryIndex!, appState.dictionary!)
    const character = word[0]

    let hskResults: Array<chinese.HSKVocabularyEntry> = []
    if (appState.hskEnabled) {
        hskResults = chinese.getHSKWordsWithSameCharacter(character, appState.hsk!, appState.hskIndex!)
    }

    let knownWordsResults: string[] = []
    if (appState.knownWordsEnabled) {
        knownWordsResults = chinese.getKnownWordsWithSameCharacter(character, appState.knownWordsList!, appState.knownWordsCharacterIndex!)
    }

    searchResponse.dictionary = dictionaryResults
    searchResponse.hsk = hskResults
    searchResponse.knownWords = knownWordsResults
    return searchResponse
}

export async function handleUpdateKnownWordsRequest(appState: AppState, request: messages.UpdateKnownWordsRequest): Promise<messages.UpdateKnownWordsResponse> {
    await state.saveNewKnownWords(appState, request.newKnownWords)
    const updateKnownWordsResponse: messages.UpdateKnownWordsResponse = { dummy: messages.DUMMY_CONTENT }
    return updateKnownWordsResponse
}

export async function handleGetAllKnownWordsRequest(appState: AppState, request: messages.GetAllKnownWordsRequest): Promise<messages.GetAllKnownWordsResponse> {
    const getAllKnownWordsResponse: messages.GetAllKnownWordsResponse = { dummy: messages.DUMMY_CONTENT, knownWords: [] }
    if (appState.knownWordsLoadStatus == ResourceLoadStatus.Loaded) {
        getAllKnownWordsResponse.knownWords = appState.knownWordsList!
    }
    return getAllKnownWordsResponse
}

export async function handleAddKnownWordRequest(appState: AppState, request: messages.AddKnownWordRequest): Promise<messages.AddKnownWordResponse> {
    const addKnownWordsResponse: messages.AddKnownWordResponse = { dummy: messages.DUMMY_CONTENT }
    if (appState.knownWordsLoadStatus == ResourceLoadStatus.Loaded && appState.knownWordsIndex?.has(request.word) == false) {
        const newKnownWords = appState.knownWordsList!.concat([request.word])
        await state.saveNewKnownWords(appState, newKnownWords)
        updateSegmentTypesForAllUserTexts(appState)
        await state.saveUserTexts(appState)
    }
    return addKnownWordsResponse
}

export async function handleRemoveKnownWordRequest(appState: AppState, request: messages.RemoveKnownWordRequest): Promise<messages.RemoveKnownWordResponse> {
    const removeKnownWordsResponse: messages.RemoveKnownWordResponse = { dummy: messages.DUMMY_CONTENT }
    if (appState.knownWordsLoadStatus == ResourceLoadStatus.Loaded && appState.knownWordsIndex?.has(request.word) == true) {
        const newKnownWords = appState.knownWordsList!.filter((word) => word != request.word)
        await state.saveNewKnownWords(appState, newKnownWords)
        updateSegmentTypesForAllUserTexts(appState)
        await state.saveUserTexts(appState)
    }
    return removeKnownWordsResponse
}

export async function handleUpdateConfigurationRequest(appState: AppState, request: messages.UpdateConfigurationRequest): Promise<messages.UpdateConfigurationResponse> {
    await state.loadConfiguration(appState)
    const updateConfigurationResponse: messages.UpdateConfigurationResponse = { dummy: messages.DUMMY_CONTENT }
    return updateConfigurationResponse
}

export function handleGetUserTextRequest(appState: AppState, request: messages.GetUserTextRequest): messages.GetUserTextResponse {
    const getUserTextRequest = request as messages.GetUserTextRequest
    const getUserTextResponse: messages.GetUserTextResponse = { dummy: messages.DUMMY_CONTENT, userText: null }

    if (appState.userTextsLoadStatus != ResourceLoadStatus.Loaded) {
        // Not loaded
        console.error(`GetUserTextRequest: User texts not loaded`)
        return getUserTextResponse
    }

    if (appState.userTextsIndex!.has(getUserTextRequest.id) == false) {
        // Not found
        console.error(`GetUserTextRequest: User text with id ${getUserTextRequest.id} not found`)
        return getUserTextResponse
    }

    // Return the user text
    const userText = appState.userTextsIndex!.get(getUserTextRequest.id)!
    getUserTextResponse.userText = userText
    return getUserTextResponse
}

export async function handleUpdateUserTextRequest(appState: AppState, request: messages.UpdateUserTextRequest): Promise<messages.UpdateUserTextResponse> {
    const updateUserTextRequest = request as messages.UpdateUserTextRequest
    const updateUserTextResponse: messages.UpdateUserTextResponse = { dummy: messages.DUMMY_CONTENT }

    if (appState.userTextsLoadStatus != ResourceLoadStatus.Loaded) {
        console.error(`UpdateUserTextRequest: User texts not loaded`)
        // Not loaded
        return (updateUserTextResponse)
    }

    if (appState.userTextsIndex!.has(updateUserTextRequest.userText.id) == false) {
        // Not found
        console.error(`UpdateUserTextRequest: User text with id ${updateUserTextRequest.userText.id} not found`)
        return (updateUserTextResponse)
    }

    // Update the user text
    appState.userTextsIndex!.set(updateUserTextRequest.userText.id, updateUserTextRequest.userText)
    await state.saveUserTexts(appState)
    return (updateUserTextResponse)
}

export async function handleDeleteUserTextRequest(appState: AppState, request: messages.DeleteUserTextRequest): Promise<messages.DeleteUserTextResponse> {
    const deleteUserTextRequest = request as messages.DeleteUserTextRequest
    const deleteUserTextResponse: messages.DeleteUserTextResponse = { dummy: messages.DUMMY_CONTENT }

    if (appState.userTextsLoadStatus != ResourceLoadStatus.Loaded) {
        // Not loaded
        console.error(`DeleteUserTextRequest: User texts not loaded`)
        return deleteUserTextResponse
    }

    if (appState.userTextsIndex!.has(deleteUserTextRequest.id) == false) {
        // Not found
        console.error(`DeleteUserTextRequest: User text with id ${deleteUserTextRequest.id} not found`)
        return deleteUserTextResponse
    }

    // Delete the user text
    appState.userTextsIndex!.delete(deleteUserTextRequest.id)
    await state.saveUserTexts(appState)
    return deleteUserTextResponse
}

export function handleGetUserTextsListRequest(appState: AppState, request: messages.GetUserTextsListRequest): messages.GetUserTextsListResponse {
    const getUserTextsListResponse: messages.GetUserTextsListResponse = { dummy: messages.DUMMY_CONTENT, userTexts: [] }

    if (appState.userTextsLoadStatus != ResourceLoadStatus.Loaded) {
        // Not loaded
        console.error(`GetUserTextsListRequest: User texts not loaded`)
        return getUserTextsListResponse
    }

    const userTextsList = []
    const iterable = appState.userTextsIndex!.values()
    while (true) {
        const next = iterable.next()
        if (next.done) {
            break
        }
        userTextsList.push(next.value)
    }

    // Sort the user texts by creation date
    userTextsList.sort((a, b) => {
        const dateA = new Date(a.createdOn)
        const dateB = new Date(b.createdOn)
        return dateB.getTime() - dateA.getTime()
    })

    // Return the user text
    getUserTextsListResponse.userTexts = userTextsList
    return getUserTextsListResponse
}