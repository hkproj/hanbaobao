import { ChineseDictionaryEntry, ChineseDictionarySearchResults, HSKVocabularyEntry } from "../pages/Background/chinese"
import { ResourceLoadStatus } from "./loading"

export enum RequestType {
    SearchTerm = "search-term"
}

export const REQUEST_SEARCH_TERM = "searchTerm"

export interface GenericRequest {
    type: RequestType
}

export interface SearchTermRequest extends GenericRequest {
    searchTerm: string
}

export interface SearchTermResponse {
    dictionary: ChineseDictionarySearchResults
    hsk: Array<HSKVocabularyEntry>
    status: ResourceLoadStatus,
    serviceEnabled: boolean,
}