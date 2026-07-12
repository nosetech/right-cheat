'use client'

import { scaledPx } from '@/utils/css'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { Box, Dialog, SvgIconProps } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import React from 'react'

export type DialogVariant = 'information' | 'warning' | 'error' | 'confirmation'

// 各バリアントの色（main/hover）は theme.palette.status で一元管理する。
// ここではアイコンと背景・ボーダーの不透明度のみを定義する。
type VariantDef = {
  Icon: React.ComponentType<SvgIconProps>
  bgAlpha: number
  borderAlpha: number
}

const VARIANT_DEFS: Record<DialogVariant, VariantDef> = {
  information: {
    Icon: InfoOutlinedIcon,
    bgAlpha: 0.13,
    borderAlpha: 0.3,
  },
  warning: {
    Icon: WarningAmberIcon,
    bgAlpha: 0.13,
    borderAlpha: 0.3,
  },
  error: {
    Icon: ErrorOutlineIcon,
    bgAlpha: 0.12,
    borderAlpha: 0.35,
  },
  confirmation: {
    Icon: HelpOutlineIcon,
    bgAlpha: 0.13,
    borderAlpha: 0.3,
  },
}

// ── Action button (primary, colored by variant) ──────────────────────────────

type ActionButtonProps = {
  variant: DialogVariant
  onClick?: () => void
  children: React.ReactNode
}

function ActionButton({ variant, onClick, children }: ActionButtonProps) {
  const theme = useTheme()
  const baseColor = theme.palette.status[variant].main

  return (
    <Box
      component='button'
      type='button'
      onClick={onClick}
      sx={{
        background: baseColor,
        color: theme.palette.onAccent,
        border: '0.5px solid transparent',
        borderRadius: '7px',
        padding: '5px 16px',
        fontFamily: theme.typography.fontFamily,
        fontSize: scaledPx(theme.custom.fontSize.body),
        fontWeight: 600,
        letterSpacing: '0.01em',
        cursor: 'pointer',
        transition: 'all 0.14s',
        minWidth: '78px',
        '&:hover': {
          background: theme.palette.status[variant].hover,
          boxShadow:
            variant === 'error'
              ? '0 2px 10px rgba(255,80,80,0.30)'
              : variant === 'warning'
                ? '0 2px 10px rgba(255,150,0,0.25)'
                : 'none',
        },
      }}
    >
      {children}
    </Box>
  )
}

// ── Secondary button (neutral, for "No") ─────────────────────────────────────

type SecondaryButtonProps = {
  onClick?: () => void
  children: React.ReactNode
}

function SecondaryButton({ onClick, children }: SecondaryButtonProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  return (
    <Box
      component='button'
      type='button'
      onClick={onClick}
      sx={{
        background: theme.palette.glass.panel,
        color: theme.palette.text.primary,
        border: `0.5px solid ${theme.palette.divider}`,
        borderRadius: '7px',
        padding: '5px 16px',
        fontFamily: theme.typography.fontFamily,
        fontSize: scaledPx(theme.custom.fontSize.body),
        fontWeight: 600,
        letterSpacing: '0.01em',
        cursor: 'pointer',
        transition: 'all 0.14s',
        minWidth: '78px',
        boxShadow: !isDark ? 'inset 0 1px 0 rgba(255,255,255,0.5)' : 'none',
        '&:hover': {
          background: theme.palette.glass.field,
        },
      }}
    >
      {children}
    </Box>
  )
}

// ── Icon circle ──────────────────────────────────────────────────────────────

type DialogIconProps = {
  variant: DialogVariant
}

function DialogIcon({ variant }: DialogIconProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const def = VARIANT_DEFS[variant]
  const color = theme.palette.status[variant].main
  const { Icon } = def

  return (
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        flexShrink: 0,
        background: alpha(color, isDark ? def.bgAlpha : 0.08),
        border: `0.5px solid ${alpha(color, isDark ? def.borderAlpha : 0.22)}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color,
      }}
    >
      <Icon sx={{ fontSize: 20 }} />
    </Box>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

type OkOnlyProps = {
  onOk: () => void
  okLabel?: string
  onYes?: never
  yesLabel?: never
  onNo?: never
  noLabel?: never
}

type YesNoProps = {
  onOk?: never
  okLabel?: never
  onYes: () => void
  yesLabel?: string
  onNo: () => void
  noLabel?: string
}

type Props = (OkOnlyProps | YesNoProps) & {
  open: boolean
  variant: DialogVariant
  title: string
  message: string
}

export function RcDialog({
  open,
  variant,
  title,
  message,
  onOk,
  okLabel = 'OK',
  onYes,
  yesLabel = 'Yes',
  onNo,
  noLabel = 'No',
}: Props) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const isYesNo = onYes !== undefined && onNo !== undefined

  return (
    <Dialog
      open={open}
      onClose={isYesNo ? onNo : onOk}
      aria-labelledby='rc-dialog-title'
      aria-describedby='rc-dialog-description'
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: isDark
              ? 'rgba(0,0,10,0.45)'
              : 'rgba(20,30,60,0.28)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
          },
        },
        paper: {
          sx: {
            width: 384,
            maxWidth: 384,
            borderRadius: '14px',
            border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)'}`,
            boxShadow: isDark
              ? '0 24px 64px rgba(0,0,0,0.65), 0 0 0 0.5px rgba(255,255,255,0.10)'
              : '0 24px 64px rgba(0,0,50,0.30), 0 0 0 0.5px rgba(255,255,255,0.7)',
            overflow: 'hidden',
            m: 0,
          },
        },
      }}
    >
      {/* Body */}
      <Box sx={{ p: '22px 22px 16px' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <DialogIcon variant={variant} />
          <Box sx={{ flex: 1, minWidth: 0, pt: '1px' }}>
            <Box
              id='rc-dialog-title'
              sx={{
                fontSize: scaledPx(theme.custom.fontSize.dialogTitle),
                fontWeight: 600,
                color: 'text.primary',
                mb: '6px',
                lineHeight: 1.4,
                letterSpacing: '0.01em',
              }}
            >
              {title}
            </Box>
            <Box
              id='rc-dialog-description'
              sx={{
                fontSize: scaledPx(theme.custom.fontSize.dialogMessage),
                lineHeight: 1.65,
                color: 'text.secondary',
                whiteSpace: 'pre-line',
              }}
            >
              {message}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          p: '12px 16px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '8px',
          background: theme.palette.glass.panel,
          borderTop: `0.5px solid ${theme.palette.divider}`,
        }}
      >
        {isYesNo ? (
          <>
            <SecondaryButton onClick={onNo}>{noLabel}</SecondaryButton>
            <ActionButton variant={variant} onClick={onYes}>
              {yesLabel}
            </ActionButton>
          </>
        ) : (
          <ActionButton variant={variant} onClick={onOk}>
            {okLabel}
          </ActionButton>
        )}
      </Box>
    </Dialog>
  )
}
