export enum ConfigurationKey {
    SEARCH_SERVICE_ENABLED = "enabled",
    HSK_ENABLED = "hsk-enabled",
    KNOWN_WORDS = "known-words",
    KNOWN_WORDS_ENABLED = "known-words-enabled",
    KNOWN_WORDS_INDEX = "known-words-index",
    CONFIGURATION_SCHEMA_VERSION = "configuration-schema-version",
    USER_TEXTS = "user-texts",
}

export function readConfiguration(key: ConfigurationKey, defaultValue: any = null): Promise<any> {

    return new Promise((resolve, reject) => {
        chrome.storage.local.get({ [key]: defaultValue }, (result) => {
            if (!(key in result)) {
                reject(`Key ${key} not found in storage`)
            }
            resolve(result[key])
        })
    })
}

export function writeConfiguration(key: ConfigurationKey, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: value }, () => {
            resolve()
        })
    })
}