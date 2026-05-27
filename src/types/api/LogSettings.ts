export type LogSettings = {
  output_dir: string | null
  max_file_size: number
  rotation_count: number
}

export const LogSettingsAPI = {
  GET_LOG_SETTINGS: 'get_log_settings',
  SET_LOG_SETTINGS: 'set_log_settings',
  OPEN_LATEST_LOG_FILE: 'open_latest_log_file',
  GET_LOG_DIR: 'get_log_dir',
} as const
