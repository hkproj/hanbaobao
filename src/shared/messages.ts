import { ChineseDictionaryEntry, ChineseDictionarySearchResults, HSKVocabularyEntry, SegmentType } from "./chineseUtils"
import { ResourceLoadStatus } from "./loading"
import { UserText } from "./userTexts";

export const DUMMY_CONTENT = 0;

export enum RequestType {
    SearchTerm = "search-term",
    UpdateKnownWords = "update-known-words",
    UpdateConfiguration = "update-configuration",
    AddNewUserText = "add-new-user-text",
    GetUserText = "get-user-text",
    UpdateUserText = "update-user-text",
}

export interface GenericRequest {
    type: RequestType
}

export interface GenericResponse {
    dummy: number // In order to never send an empty response
}

export interface SearchTermRequest extends GenericRequest {
    searchTerm: string,
    ignoreDisabledStatus: boolean
}

export interface SearchTermResponse extends GenericResponse {
    dictionary: ChineseDictionarySearchResults,
    hsk: Array<HSKVocabularyEntry>,
    knownWords: Array<string>,
    status: ResourceLoadStatus,
    serviceEnabled: boolean,
}

export interface UpdateKnownWordsRequest extends GenericRequest {
}

export interface UpdateKnownWordsResponse extends GenericResponse {

}

export interface UpdateConfigurationRequest extends GenericRequest {
}

export interface UpdateConfigurationResponse extends GenericResponse {
}

export interface AddNewUserTextRequest extends GenericRequest {
    text: string,
    url: string,
}

export interface AddNewUserTextResponse extends GenericResponse {
    id: string | null
}

export interface GetUserTextRequest extends GenericRequest {
    id: string
}

export interface GetUserTextResponse extends GenericResponse {
    userText: UserText | null
}

export interface UpdateUserTextRequest extends GenericRequest {
    userText: UserText
}

export interface UpdateUserTextResponse extends GenericResponse {
}

export interface AddKnownWordRequest extends GenericRequest {
    word: string
}

export interface AddKnownWordResponse extends GenericResponse {
}

export interface RemoveKnownWordRequest extends GenericRequest {
    word: string
}

export interface RemoveKnownWordResponse extends GenericResponse {
}

export interface AddIgnoredWordRequest extends GenericRequest {
    word: string
}

export interface AddIgnoredWordResponse extends GenericResponse {
}

export interface RemoveIgnoredWordRequest extends GenericRequest {
    word: string
}

export interface RemoveIgnoredWordResponse extends GenericResponse {
}

export interface CleanKnownWordsRequest extends GenericRequest {
}

export interface CleanKnownWordsResponse extends GenericResponse {
}

export interface CleanIgnoredWordsRequest extends GenericRequest {
}

export interface CleanIgnoredWordsResponse extends GenericResponse {
}