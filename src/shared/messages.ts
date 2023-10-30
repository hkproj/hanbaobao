import { ChineseDictionaryEntry, ChineseDictionarySearchResults, HSKVocabularyEntry } from "./chineseUtils"
import { ResourceLoadStatus } from "./loading"

export const DUMMY_CONTENT = 0;

export enum RequestType {
    SearchTerm = "search-term",
    UpdateKnownWords = "update-known-words",
    UpdateConfiguration = "update-configuration",
    GetSelectedText = "get-selected-text",
    SegmentText = "segment-text",
}

export interface GenericRequest {
    type: RequestType
}

export interface GenericResponse {
    dummy: number // In order to never send an empty response
}

export interface SearchTermRequest extends GenericRequest {
    searchTerm: string
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

export interface GetSelectedTextRequest extends GenericRequest {
    clean: boolean
}

export interface GetSelectedTextResponse extends GenericResponse {
    selectedText: string
}

export interface SegmentTextRequest extends GenericRequest {
    text: string
}

export interface SegmentTextResponse extends GenericResponse {
    segments: Array<string>
}