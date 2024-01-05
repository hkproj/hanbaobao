import { SegmentType } from "./chineseUtils";
import { ConfigurationKey, readConfiguration, writeConfiguration } from "./configuration";
import * as jieba from "./jieba";
import { AppState } from "../pages/Background/state";
import * as chinese from "./chineseUtils";

export interface TextSegment {
    text: string
    type: SegmentType
}

export interface UserText {
    id: string
    name: string
    url: string
    segments: Array<TextSegment>
    createdOn: string
}

function getNewUUID(): string {
    return crypto.randomUUID()
}

export async function addUserText(userTextsIndex: Map<string, UserText>, userText: UserText): Promise<[UserText, Map<string, UserText>]> {
    // Make sure it has a unique GUID id
    userText.id = getNewUUID()
    userTextsIndex.set(userText.id, userText)
    return [userText, userTextsIndex]
}

export function updateSegmentTypesForAllUserTexts(appState: AppState): void {
    for (const userText of appState.userTextsIndex!.values()) {
        updateSegmentTypes(userText.segments, appState)
    }
}

export function segmentAndCategorizeText(text: string, appState: AppState): Array<TextSegment> {
    const segmentsTexts = jieba.cut(appState.jiebaData!, text)

    const segments: Array<TextSegment> = []

    for (let i = 0; i < segmentsTexts.length; i++) {
        segments.push({
            text: segmentsTexts[i],
            type: chinese.SegmentType.Unknown,
        })
    }

    updateSegmentTypes(segments, appState)

    return segments
}

export function updateSegmentTypes(segments: Array<TextSegment>, appState: AppState): void {
    chinese.categorizeSegments(segments, appState)
}