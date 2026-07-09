export const MAX_TITLE = 100

let _uid = 0
export const nextLocalId = () => `loc${_uid++}`
