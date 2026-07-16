'use client'
import { scaledPx } from '@/utils/css'
import { RefObject } from 'react'

import { Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import { CopyIcon } from '@/components/atoms/icons'
import { ClipboardHistoryFooter } from '@/components/molecules/ClipboardHistoryFooter'
import { HistoryItemRow } from '@/components/molecules/HistoryItemRow'
import { RcDialog } from '@/components/organisms/RcDialog'
import { ClipboardHistoryState } from '@/hooks/useClipboardHistory'
import { ClipboardHistoryItem } from '@/types/api/ClipboardHistory'

type Props = {
  history: ClipboardHistoryState
  /** 数字キー（1〜9）での再コピー用に各行の要素を登録する */
  itemRefs: RefObject<Array<HTMLDivElement | null>>
  /** 編集モードの行アクション「Add to Cheat Sheet」で別ウィンドウを開く */
  onAddToSheet: (item: ClipboardHistoryItem) => void
}

/**
 * クリップボード履歴ウィンドウの本体。
 * 履歴一覧（空の場合はプレースホルダー）・固定フッター・
 * 全クリア確認ダイアログを描画する。
 */
export function ClipboardHistorySheet({
  history,
  itemRefs,
  onAddToSheet,
}: Props) {
  const theme = useTheme()

  const {
    items,
    editMode,
    dirty,
    isSaving,
    cancelEditMode,
    saveEditMode,
    deleteItem,
    clearAll,
    confirmClearOpen,
    setConfirmClearOpen,
  } = history

  return (
    <>
      <Box sx={{ flex: 1, overflow: 'auto', px: 1.5, py: 1 }}>
        {items.length > 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0.75,
              py: 1,
            }}
          >
            {items.map((item, index) => (
              <HistoryItemRow
                key={item.id}
                ref={(el) => {
                  itemRefs.current[index] = el
                }}
                text={item.text}
                numberHint={(index + 1).toString()}
                editMode={editMode}
                onAddToSheet={() => onAddToSheet(item)}
                onDelete={() => deleteItem(item.id)}
              />
            ))}
          </Box>
        ) : (
          // 空状態プレースホルダー
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              padding: '48px 24px',
              textAlign: 'center',
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: theme.palette.surface.hover,
                border: `0.5px solid ${theme.palette.divider}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.palette.text.disabled,
              }}
            >
              <CopyIcon size={18} strokeWidth={2} />
            </Box>
            <Box
              sx={{
                fontSize: scaledPx(theme.custom.fontSize.dialogMessage),
                fontWeight: 600,
                color: 'text.secondary',
              }}
            >
              No clipboard history
            </Box>
            <Box
              sx={{
                fontSize: scaledPx(theme.custom.fontSize.captionSm),
                color: 'text.disabled',
                lineHeight: 1.5,
              }}
            >
              Copied text will appear here.
            </Box>
          </Box>
        )}
      </Box>

      <ClipboardHistoryFooter
        itemCount={items.length}
        editMode={editMode}
        editDirty={dirty}
        isSaving={isSaving}
        onClear={() => setConfirmClearOpen(true)}
        onCancel={cancelEditMode}
        onSave={() => void saveEditMode()}
      />

      {/* 全クリア確認ダイアログ */}
      <RcDialog
        open={confirmClearOpen}
        variant='error'
        title='Clear clipboard history'
        message={`Delete all ${items.length} ${items.length === 1 ? 'item' : 'items'} from the clipboard history? This action cannot be undone.`}
        onYes={() => void clearAll()}
        yesLabel='Clear All'
        onNo={() => setConfirmClearOpen(false)}
        noLabel='Cancel'
      />
    </>
  )
}
