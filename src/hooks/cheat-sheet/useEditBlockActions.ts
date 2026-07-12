import { Dispatch, SetStateAction, useCallback } from 'react'

import { CommandLayout } from '@/types/api/CheatSheet'
import {
  EditBlock,
  EditCommandData,
  EditGroupData,
  isEditGroup,
} from '@/types/edit/EditBlock'
import {
  EditCommandSavePayload,
  EditGroupSavePayload,
} from '@/types/edit/EditWindow'

type Params = {
  isShortcuts: boolean
  setEditBlocks: Dispatch<SetStateAction<EditBlock[]>>
}

/**
 * 編集モードのコマンド/グループの追加・更新・削除を行うフック。
 * 別ウィンドウの保存イベント（upsert）と行の削除（delete）を提供する。
 */
export function useEditBlockActions({ isShortcuts, setEditBlocks }: Params) {
  const upsertCommand = useCallback(
    (payload: EditCommandSavePayload) => {
      const {
        _editId,
        dbId,
        isNew,
        description,
        commandText,
        key,
        layout,
        targetGroupEditId,
      } = payload
      const newItem: EditCommandData = {
        _editId,
        id: dbId,
        description: description.trim() || undefined,
        command: isShortcuts ? key.trim() : commandText,
        layout:
          !isShortcuts && layout && layout !== 'inherit'
            ? (layout as CommandLayout)
            : undefined,
      }

      setEditBlocks((prev) => {
        let next: EditBlock[]
        if (isNew) {
          next = [...prev]
        } else {
          // 既存アイテムを現在の位置から削除
          next = prev
            .map((block) => {
              if (isEditGroup(block)) {
                return {
                  ...block,
                  commandlist: block.commandlist.filter(
                    (it) => it._editId !== _editId,
                  ),
                }
              }
              return block
            })
            .filter(
              (block) => isEditGroup(block) || block._editId !== _editId,
            ) as EditBlock[]
        }
        // 新しい位置に挿入
        if (targetGroupEditId) {
          return next.map((block) => {
            if (isEditGroup(block) && block._editId === targetGroupEditId) {
              return { ...block, commandlist: [...block.commandlist, newItem] }
            }
            return block
          })
        }
        return [...next, newItem]
      })
    },
    [isShortcuts, setEditBlocks],
  )

  const upsertGroup = useCallback(
    (payload: EditGroupSavePayload) => {
      const { _editId, isNew, name } = payload
      if (isNew) {
        const newGroup: EditGroupData = {
          _editId,
          group: name,
          commandlist: [],
        }
        setEditBlocks((prev) => [...prev, newGroup])
      } else {
        setEditBlocks((prev) =>
          prev.map((block) => {
            if (isEditGroup(block) && block._editId === _editId) {
              return { ...block, group: name }
            }
            return block
          }),
        )
      }
    },
    [setEditBlocks],
  )

  const deleteCommand = useCallback(
    (editId: string) => {
      setEditBlocks(
        (prev) =>
          prev
            .map((block) => {
              if (isEditGroup(block)) {
                return {
                  ...block,
                  commandlist: block.commandlist.filter(
                    (it) => it._editId !== editId,
                  ),
                }
              }
              return block
            })
            .filter(
              (block) => isEditGroup(block) || block._editId !== editId,
            ) as EditBlock[],
      )
    },
    [setEditBlocks],
  )

  const deleteGroup = useCallback(
    (editId: string) => {
      setEditBlocks((prev) =>
        prev.filter(
          (block) => !(isEditGroup(block) && block._editId === editId),
        ),
      )
    },
    [setEditBlocks],
  )

  return { upsertCommand, upsertGroup, deleteCommand, deleteGroup }
}
