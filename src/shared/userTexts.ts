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

export function splitSegmentsInUserText(userText: UserText, originalText: string, splitIndex: number): void {
    if (splitIndex <= 0 || splitIndex >= originalText.length) {
        throw new Error("Invalid split index")
    }

    if (originalText.trim().length == 0) {
        throw new Error("Cannot split an empty segment")
    }

    let i = 0;

    while (i < userText.segments.length) {

        // If there's a segment matching the original text, then split it
        if (userText.segments[i].text == originalText) {
            // Split the segment according to the split index
            const firstSegmentText = originalText.substring(0, splitIndex)
            const secondSegmentText = originalText.substring(splitIndex)

            userText.segments[i].text = firstSegmentText
            userText.segments[i].type = chinese.SegmentType.Unknown

            userText.segments.splice(i + 1, 0, {
                text: secondSegmentText,
                type: chinese.SegmentType.Unknown,
            })
        }

        i++
    }
}

export function joinSegmentsInUserText(userText: UserText, segmentTexts: string[]): void {
    if (segmentTexts.length < 2) {
        throw new Error("Cannot join less than two segments")
    }

    for (let i = 0; i < segmentTexts.length; i++) {
        if (segmentTexts[i].trim().length == 0) {
            throw new Error("Cannot join empty segments")
        }
    }

    let startIndex = 0;
    while (startIndex < userText.segments.length - (segmentTexts.length - 1)) {

        let match = true;

        // Verify if all the segments match starting from 'startIndex'
        for (let currentSegmentIndex = 0; currentSegmentIndex < segmentTexts.length; currentSegmentIndex++) {
            if (userText.segments[startIndex + currentSegmentIndex].text != segmentTexts[currentSegmentIndex]) {
                match = false;
                break;
            }
        }

        if (match) {
            // Replace the segments with a single one
            const newSegmentText = segmentTexts.join("")
            userText.segments[startIndex].text = newSegmentText
            userText.segments[startIndex].type = chinese.SegmentType.Unknown

            // Remove the other segments
            userText.segments.splice(startIndex + 1, segmentTexts.length - 1)
        }

        startIndex++
    }
}