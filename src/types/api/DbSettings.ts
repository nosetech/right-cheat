export type DbSettings = {
  output_path: string | null
}

export const DbSettingsAPI = {
  GET_DB_SETTINGS: 'get_db_settings',
  SET_DB_SETTINGS: 'set_db_settings',
  GET_DB_PATH: 'get_db_path',
} as const
