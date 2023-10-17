export enum ConfigurationKey {
    ENABLED = 'enabled',
}

export function readConfiguration(key: ConfigurationKey, defaultValue: any = null): Promise<any> {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(key, (result) => {
            if (key in result) {
                resolve(result[key])
            } else {
                resolve(defaultValue)
            }
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