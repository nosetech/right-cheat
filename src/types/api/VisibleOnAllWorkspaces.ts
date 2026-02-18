export class VisibleOnAllWorkspacesAPI {
  static readonly GET_VISIBLE_ON_ALL_WORKSPACES_SETTING =
    'get_visible_on_all_workspaces_setting'
  static readonly SET_VISIBLE_ON_ALL_WORKSPACES_SETTING =
    'set_visible_on_all_workspaces_setting'
}

export type VisibleOnAllWorkspacesSettings = {
  enabled: boolean
}
