import { SegmentType } from "./chineseUtils";
import { ConfigurationKey, readConfiguration, writeConfiguration } from "./configuration";

export interface UserText {
    id: string
    name: string
    url: string
    segments: Array<string>
    segmentTypes: Array<SegmentType>
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

export async function deleteUserText(userTextList: Array<UserText>, userTextId: string) {
    const index = userTextList.findIndex((userText) => userText.id === userTextId)
    if (index >= 0) {
        userTextList.splice(index, 1)
    }
    return userTextList
}

export async function updateUserText(userTextList: Array<UserText>, userText: UserText) {
    const index = userTextList.findIndex((userText) => userText.id === userText.id)
    if (index >= 0) {
        userTextList[index] = userText
    }
    return userTextList
}