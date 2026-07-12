'use client'
import { RefObject } from 'react'

import { Box, Stack } from '@mui/material'

import { EditableGroupBox } from '@/components/molecules/EditableGroupBox'
import { DropIndicator } from '@/components/organisms/cheat-sheet/DropIndicator'
import { EditableItemRow } from '@/components/organisms/cheat-sheet/EditableItemRow'
import { CommandLayout } from '@/types/api/CheatSheet'
import {
  EditBlock,
  EditCommandData,
  EditGroupData,
  isEditGroup,
} from '@/types/edit/EditBlock'
import { DragInfo, DropMark } from '@/types/edit/dnd'

type RefMap = RefObject<Map<string, HTMLDivElement>>

type Props = {
  editBlocks: EditBlock[]
  isShortcuts: boolean
  cheatSheetLayout?: CommandLayout
  dragInfo: DragInfo | null
  dropMark: DropMark | null
  editFlatStartIndices: number[]
  onPointerDown: (
    e: React.PointerEvent,
    blockIndex: number,
    itemIndex?: number,
  ) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: () => void
  onPointerCancel: () => void
  blockRefsMap: RefMap
  groupBodyRefsMap: RefMap
  itemRefsMap: RefMap
  onEditCommand: (
    item: EditCommandData | null,
    initialGroupEditId: string | null,
    isNew: boolean,
  ) => void
  onDeleteCommand: (editId: string) => void
  onRenameGroup: (group: EditGroupData) => void
  onDeleteGroup: (editId: string) => void
}

// ref マップへの登録/解除コールバックを生成するヘルパー。
const registerRef =
  (map: RefMap, key: string) => (el: HTMLDivElement | null) => {
    if (el) map.current.set(key, el)
    else map.current.delete(key)
  }

/**
 * 編集モードのブロック一覧。グループ/トップレベルアイテムの描画、
 * ドロップインジケーター、DnD 用の ref 登録を担う。
 */
export function EditBlockList({
  editBlocks,
  isShortcuts,
  cheatSheetLayout,
  dragInfo,
  dropMark,
  editFlatStartIndices,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  blockRefsMap,
  groupBodyRefsMap,
  itemRefsMap,
  onEditCommand,
  onDeleteCommand,
  onRenameGroup,
  onDeleteGroup,
}: Props) {
  return (
    <Stack
      spacing={0}
      sx={{
        py: 1,
        minHeight: '40px',
        userSelect: dragInfo ? 'none' : undefined,
      }}
    >
      {editBlocks.map((block, blockIndex) => {
        const isBlockDragging =
          dragInfo?.blockIndex === blockIndex &&
          dragInfo.itemIndex === undefined
        const isBlockDropTarget =
          dropMark?.kind === 'between-blocks' &&
          dropMark.afterBlockIndex === blockIndex - 1

        return (
          <Box key={block._editId}>
            {/* ドロップインジケーター（上） */}
            {isBlockDropTarget && <DropIndicator level='block' />}

            {isEditGroup(block) ? (
              // グループ
              <EditableGroupBox
                groupName={block.group}
                isEmpty={block.commandlist.length === 0}
                isDragging={isBlockDragging}
                isDropTarget={
                  dropMark?.kind === 'into-group' &&
                  dropMark.groupBlockIndex === blockIndex
                }
                onRename={() => onRenameGroup(block)}
                onDelete={() => onDeleteGroup(block._editId)}
                onPointerDown={(e) => onPointerDown(e, blockIndex)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                blockRef={registerRef(blockRefsMap, block._editId)}
                groupBodyRef={registerRef(groupBodyRefsMap, block._editId)}
              >
                <Stack spacing={0}>
                  {block.commandlist.map((item, itemIndex) => {
                    const isItemDragging =
                      dragInfo?.blockIndex === blockIndex &&
                      dragInfo.itemIndex === itemIndex
                    const isItemDropTarget =
                      dropMark?.kind === 'between-items' &&
                      dropMark.groupBlockIndex === blockIndex &&
                      dropMark.afterItemIndex === itemIndex - 1

                    return (
                      <Box key={item._editId}>
                        {isItemDropTarget && <DropIndicator level='item' />}
                        <EditableItemRow
                          isShortcuts={isShortcuts}
                          index={editFlatStartIndices[blockIndex] + itemIndex}
                          item={item}
                          layout={item.layout ?? cheatSheetLayout ?? 'inline'}
                          isDragging={isItemDragging}
                          isDropTarget={
                            dropMark?.kind === 'between-items' &&
                            dropMark.groupBlockIndex === blockIndex &&
                            dropMark.afterItemIndex === itemIndex
                          }
                          onEdit={() =>
                            onEditCommand(item, block._editId, false)
                          }
                          onDelete={() => onDeleteCommand(item._editId)}
                          onPointerDown={(e) =>
                            onPointerDown(e, blockIndex, itemIndex)
                          }
                          onPointerMove={onPointerMove}
                          onPointerUp={onPointerUp}
                          onPointerCancel={onPointerCancel}
                          rowRef={registerRef(itemRefsMap, item._editId)}
                        />
                      </Box>
                    )
                  })}
                  {/* グループ末尾ドロップインジケーター */}
                  {dropMark?.kind === 'between-items' &&
                    dropMark.groupBlockIndex === blockIndex &&
                    dropMark.afterItemIndex ===
                      block.commandlist.length - 1 && (
                      <DropIndicator level='item' />
                    )}
                </Stack>
              </EditableGroupBox>
            ) : (
              // トップレベルアイテム
              <EditableItemRow
                isShortcuts={isShortcuts}
                index={editFlatStartIndices[blockIndex]}
                item={block as EditCommandData}
                layout={
                  (block as EditCommandData).layout ??
                  cheatSheetLayout ??
                  'inline'
                }
                isDragging={isBlockDragging}
                isDropTarget={
                  dropMark?.kind === 'between-blocks' &&
                  dropMark.afterBlockIndex === blockIndex
                }
                onEdit={() =>
                  onEditCommand(block as EditCommandData, null, false)
                }
                onDelete={() =>
                  onDeleteCommand((block as EditCommandData)._editId)
                }
                onPointerDown={(e) => onPointerDown(e, blockIndex)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                rowRef={registerRef(blockRefsMap, block._editId)}
              />
            )}
          </Box>
        )
      })}

      {/* リスト末尾ドロップインジケーター */}
      {dropMark?.kind === 'between-blocks' &&
        dropMark.afterBlockIndex === editBlocks.length - 1 && (
          <DropIndicator level='block' />
        )}
    </Stack>
  )
}
