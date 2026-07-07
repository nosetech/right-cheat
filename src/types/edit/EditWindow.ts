import { SheetType } from '@/types/api/CheatSheet'
import {
  EditCommandData,
  EditGroupData,
  GroupOption,
} from '@/types/edit/EditBlock'

export type EditCommandInitPayload = {
  kind: SheetType
  item: EditCommandData | null
  groups: GroupOption[]
  initialGroupEditId: string | null
  isNew: boolean
}

export type EditCommandSavePayload = {
  _editId: string
  dbId: number | undefined
  isNew: boolean
  description: string
  commandText: string
  key: string
  layout: string
  targetGroupEditId: string | null
}

export type EditGroupInitPayload = {
  group: EditGroupData | null
  isNew: boolean
}

export type EditGroupSavePayload = {
  _editId: string
  isNew: boolean
  name: string
}
