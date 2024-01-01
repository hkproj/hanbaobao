import * as messages from '../../shared/messages'
import { ResourceLoadStatus } from "../../shared/loading";
import { AppState } from './state';
import { UserText, addUserText } from "../../shared/userTexts";
import * as chinese from "../../shared/chineseUtils";
import * as jieba from "../../shared/jieba";
import * as state from "./state";

export async function handleAddNewUserTextRequest(appState: AppState, addNewUserTextRequest: messages.AddNewUserTextRequest) {
    const addNewUserTextResponse: messages.AddNewUserTextResponse = { dummy: messages.DUMMY_CONTENT, id: null }

    if (appState.userTextsLoadStatus != ResourceLoadStatus.Loaded || appState.jiebaLoadStatus != ResourceLoadStatus.Loaded || appState.knownWordsLoadStatus != ResourceLoadStatus.Loaded) {
        return addNewUserTextResponse
    }

    const segments = jieba.cut(appState.jiebaData!, addNewUserTextRequest.text)
    const segmentTypes = chinese.categorizeSegments(segments, appState)
    const userTextToAdd: UserText = {
        id: "", // It will be assigned a new unique id
        name: "New user text",
        url: addNewUserTextRequest.url,
        segments: segments,
        segmentTypes: segmentTypes,
        created: new Date(),
    }

    const [newUserText, newUserTextsIndex] = await addUserText(appState.userTextsIndex!, userTextToAdd)
    // Verify that the id has been assigned, otherwise throw an error
    if (newUserText.id == null || newUserText.id == "") {
        throw new Error("No id was assigned to a newly created user text")
    }

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

    if (appState.dictionaryLoadStatus === ResourceLoadStatus.Unloaded || (!appState.searchServiceEnabled && !searchTermRequest.ignoreDisabledStatus)) {
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
    if (appState.knownWordsLoadStatus == ResourceLoadStatus.Loaded && appState.knownWordsCharacterIndex?.has(request.word) == false) {
        const newKnownWords = appState.knownWordsList!.concat([request.word])
        await state.saveNewKnownWords(appState, newKnownWords)
    }
    return addKnownWordsResponse
}

export async function handleRemoveKnownWordRequest(appState: AppState, request: messages.RemoveKnownWordRequest): Promise<messages.RemoveKnownWordResponse> {
    const removeKnownWordsResponse: messages.RemoveKnownWordResponse = { dummy: messages.DUMMY_CONTENT }
    if (appState.knownWordsLoadStatus == ResourceLoadStatus.Loaded && appState.knownWordsCharacterIndex?.has(request.word) == true) {
        const newKnownWords = appState.knownWordsList!.filter((word) => word != request.word)
        await state.saveNewKnownWords(appState, newKnownWords)
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
        return getUserTextResponse
    }

    if (appState.userTextsIndex!.has(getUserTextRequest.id) == false) {
        // Not found
        return getUserTextResponse
    }

    // Return the user text
    const userText = appState.userTextsIndex!.get(getUserTextRequest.id)!
    getUserTextResponse.userText = userText
    return getUserTextResponse
}

export function handleUpdateUserText(appState: AppState, request: messages.UpdateUserTextRequest): messages.UpdateUserTextResponse {
    const updateUserTextRequest = request as messages.UpdateUserTextRequest
    const updateUserTextResponse: messages.UpdateUserTextResponse = { dummy: messages.DUMMY_CONTENT }

    if (appState.userTextsLoadStatus != ResourceLoadStatus.Loaded) {
        // Not loaded
        return (updateUserTextResponse)
    }

    if (appState.userTextsIndex!.has(updateUserTextRequest.userText.id) == false) {
        // Not found
        return (updateUserTextResponse)
    }

    // Update the user text
    appState.userTextsIndex!.set(updateUserTextRequest.userText.id, updateUserTextRequest.userText)
    state.saveUserTexts(appState)
    return (updateUserTextResponse)
}