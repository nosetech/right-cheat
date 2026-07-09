'use client'
import { scaledPx } from '@/utils/css'

import { Box } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'

import { AlertCircleIcon, PlusIcon } from '@/components/atoms/icons'
import { FooterButton } from '@/components/molecules/FooterButton'
import { WindowTitleBar } from '@/components/molecules/WindowTitleBar'
import { EditRow } from '@/components/organisms/edit-cheatsheets'
import { RcDialog } from '@/components/organisms/RcDialog'
import { TITLEBAR_HEIGHT } from '@/constants/layout'
import { useNotificationContext } from '@/context/NotificationContext'
import { useEditableRows } from '@/hooks/edit-cheatsheets/useEditableRows'
import { useRowDragAndDrop } from '@/hooks/edit-cheatsheets/useRowDragAndDrop'
import { useSaveCheatsheets } from '@/hooks/edit-cheatsheets/useSaveCheatsheets'

export default function EditCheatsheetsPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const accent = theme.palette.accent.main
  const divider = theme.palette.divider

  const { showError } = useNotificationContext() ?? {}

  const {
    rows,
    loading,
    dirty,
    editingId,
    setEditingId,
    listEndRef,
    errors,
    errorCt,
    addRow,
    removeRow,
    updateTitle,
    updateType,
    updateLayout,
    moveRow,
    reorderRows,
  } = useEditableRows()

  const {
    dragId,
    dropTarget,
    registerRow,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  } = useRowDragAndDrop({ reorderRows })

  const {
    saving,
    canSave,
    confirmSaveOpen,
    setConfirmSaveOpen,
    confirmCancelOpen,
    setConfirmCancelOpen,
    onSave,
    doSave,
    onCancel,
    doCancel,
  } = useSaveCheatsheets({ rows, dirty, errorCt, showError })

  return (
    <>
      <Box
        data-tauri-drag-region
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: `${TITLEBAR_HEIGHT}px`,
          zIndex: 999,
        }}
      />
      <WindowTitleBar title='Edit Cheatsheets' />

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: `calc(100vh - ${TITLEBAR_HEIGHT}px)`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Row list */}
        <Box
          style={{ userSelect: dragId ? 'none' : undefined }}
          sx={{
            flex: 1,
            minHeight: 0,
            padding: '14px 14px 6px',
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: isDark
              ? 'rgba(255,255,255,0.12) transparent'
              : 'rgba(0,0,0,0.12) transparent',
          }}
        >
          {loading ? (
            <Box
              sx={{
                padding: '16px',
                fontSize: scaledPx(theme.custom.fontSize.body),
                color: theme.palette.text.secondary,
              }}
            >
              Loading...
            </Box>
          ) : rows.length === 0 ? (
            <Box
              sx={{
                padding: '16px',
                fontSize: scaledPx(theme.custom.fontSize.body),
                color: theme.palette.text.secondary,
              }}
            >
              No cheat sheets. Add one below.
            </Box>
          ) : (
            rows.map((r, i) => (
              <EditRow
                key={r.localId}
                row={r}
                index={i}
                error={errors[i]}
                isEditing={editingId === r.localId}
                isDragging={dragId === r.localId}
                dropTarget={
                  dropTarget && dropTarget.id === r.localId
                    ? dropTarget.position
                    : null
                }
                onStartEdit={() => setEditingId(r.localId)}
                onEndEdit={() => setEditingId(null)}
                onChange={(v) => updateTitle(r.localId, v)}
                onTypeChange={(v) => updateType(r.localId, v)}
                onLayoutChange={(v) => updateLayout(r.localId, v)}
                onRemove={() => removeRow(r.localId)}
                onPointerDown={onPointerDown(r.localId)}
                onPointerMove={onPointerMove(r.localId)}
                onPointerUp={onPointerUp(r.localId)}
                onPointerCancel={onPointerCancel}
                onRowRef={(el) => registerRow(r.localId, el)}
                onMoveUp={() => moveRow(r.localId, 'up')}
                onMoveDown={() => moveRow(r.localId, 'down')}
              />
            ))
          )}
          <div ref={listEndRef} />
        </Box>

        {/* Pinned controls */}
        <Box
          sx={{
            flexShrink: 0,
            borderTop: `0.5px solid ${divider}`,
            background: theme.palette.glass.panel,
          }}
        >
          {/* Add row button */}
          <Box sx={{ padding: '10px 14px 8px' }}>
            <Box
              component='button'
              onClick={addRow}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background =
                  alpha(theme.palette.accent.main, isDark ? 0.06 : 0.05)
                ;(e.currentTarget as HTMLButtonElement).style.borderColor =
                  accent
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background =
                  'transparent'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor =
                  alpha(theme.palette.accent.main, isDark ? 0.32 : 0.3)
              }}
              sx={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                background: 'transparent',
                border: `1px dashed ${alpha(theme.palette.accent.main, isDark ? 0.32 : 0.3)}`,
                borderRadius: '8px',
                padding: '8px 10px',
                cursor: 'pointer',
                fontFamily: theme.typography.fontFamily,
                fontSize: scaledPx(theme.custom.fontSize.body),
                fontWeight: 500,
                color: accent,
                transition: 'all 0.14s',
              }}
            >
              <PlusIcon size={12} strokeWidth={2.4} />
              Add cheatsheet
            </Box>
          </Box>

          {/* Footer */}
          <Box
            sx={{
              borderTop: `0.5px solid ${divider}`,
              padding: '10px 16px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            {/* Status text */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                minHeight: '18px',
              }}
            >
              {errorCt > 0 ? (
                <>
                  <AlertCircleIcon
                    size={12}
                    strokeWidth={2.2}
                    color={theme.palette.danger.text}
                    style={{ flexShrink: 0 }}
                  />
                  <Box
                    component='span'
                    sx={{
                      fontFamily: theme.typography.fontFamily,
                      fontSize: scaledPx(theme.custom.fontSize.captionSm),
                      color: theme.palette.danger.text,
                      fontWeight: 500,
                    }}
                  >
                    {errorCt} {errorCt === 1 ? 'error' : 'errors'}
                  </Box>
                </>
              ) : dirty ? (
                <Box
                  component='span'
                  sx={{
                    fontFamily: theme.typography.fontFamily,
                    fontSize: scaledPx(theme.custom.fontSize.captionSm),
                    color: theme.palette.text.secondary,
                    fontStyle: 'italic',
                  }}
                >
                  Unsaved changes
                </Box>
              ) : (
                <Box
                  component='span'
                  sx={{
                    fontFamily: theme.typography.fontFamily,
                    fontSize: scaledPx(theme.custom.fontSize.captionSm),
                    color: isDark
                      ? 'rgba(255,255,255,0.22)'
                      : 'rgba(0,0,0,0.28)',
                  }}
                >
                  No changes
                </Box>
              )}
            </Box>

            {/* Buttons */}
            <Box sx={{ display: 'flex', gap: '8px' }}>
              <FooterButton onClick={onCancel}>Cancel</FooterButton>
              <FooterButton onClick={onSave} primary disabled={!canSave}>
                {saving ? 'Saving…' : 'Save'}
              </FooterButton>
            </Box>
          </Box>
        </Box>
      </Box>

      <RcDialog
        open={confirmSaveOpen}
        variant='confirmation'
        title='Save Changes'
        message='Save changes and close?'
        onYes={doSave}
        yesLabel='Save'
        onNo={() => setConfirmSaveOpen(false)}
        noLabel='Cancel'
      />
      <RcDialog
        open={confirmCancelOpen}
        variant='confirmation'
        title='Discard Changes'
        message='You have unsaved changes. Close anyway?'
        onYes={doCancel}
        yesLabel='Close'
        onNo={() => setConfirmCancelOpen(false)}
        noLabel='Keep editing'
      />
    </>
  )
}
