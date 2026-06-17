import {
  CommandData,
  CommandGroupData,
  CommandListItem,
  isCommandGroupData,
} from '@/types/api/CheatSheet'

export type EditCommandData = CommandData & { _editId: string }

export type EditGroupData = {
  _editId: string
  id?: number
  group: string
  commandlist: EditCommandData[]
}

export type EditBlock = EditCommandData | EditGroupData

export const isEditGroup = (b: EditBlock): b is EditGroupData => 'group' in b

const newEditId = () => crypto.randomUUID()

export const toEditBlocks = (items: CommandListItem[]): EditBlock[] =>
  items.map((item) => {
    if (isCommandGroupData(item)) {
      return {
        ...item,
        _editId: newEditId(),
        commandlist: item.commandlist.map((c) => ({
          ...c,
          _editId: newEditId(),
        })),
      } as EditGroupData
    }
    return { ...item, _editId: newEditId() } as EditCommandData
  })

export const fromEditBlocks = (blocks: EditBlock[]): CommandListItem[] =>
  blocks.map((block): CommandListItem => {
    if (isEditGroup(block)) {
      const { _editId: _g, ...rest } = block
      const groupData: CommandGroupData = {
        ...rest,
        commandlist: block.commandlist.map(
          ({ _editId: _i, ...item }) => item as CommandData,
        ),
      }
      return groupData
    }
    const { _editId: _, ...item } = block
    return item as CommandData
  })

export type GroupOption = {
  editId: string
  name: string
}

export const getGroupOptions = (blocks: EditBlock[]): GroupOption[] =>
  blocks.filter(isEditGroup).map((b) => ({ editId: b._editId, name: b.group }))
