'use client'

import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { Box, Dialog, SvgIconProps } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import React from 'react'

export type DialogVariant = 'information' | 'warning' | 'error' | 'confirmation'

type VariantDef = {
  Icon: React.ComponentType<SvgIconProps>
  colorDark: string
  colorLight: string
  bgDark: string
  bgLight: string
  borderDark: string
  borderLight: string
}

const VARIANT_DEFS: Record<DialogVariant, VariantDef> = {
  information: {
    Icon: InfoOutlinedIcon,
    colorDark: '#64b4ff',
    colorLight: '#0071e3',
    bgDark: 'rgba(100,180,255,0.13)',
    bgLight: 'rgba(0,113,227,0.08)',
    borderDark: 'rgba(100,180,255,0.30)',
    borderLight: 'rgba(0,113,227,0.22)',
  },
  warning: {
    Icon: WarningAmberIcon,
    colorDark: '#ffb74d',
    colorLight: '#ed6c02',
    bgDark: 'rgba(255,183,77,0.13)',
    bgLight: 'rgba(237,108,2,0.08)',
    borderDark: 'rgba(255,183,77,0.30)',
    borderLight: 'rgba(237,108,2,0.22)',
  },
  error: {
    Icon: ErrorOutlineIcon,
    colorDark: '#ff6b6b',
    colorLight: '#d32f2f',
    bgDark: 'rgba(255,107,107,0.12)',
    bgLight: 'rgba(211,47,47,0.08)',
    borderDark: 'rgba(255,107,107,0.35)',
    borderLight: 'rgba(211,47,47,0.22)',
  },
  confirmation: {
    Icon: HelpOutlineIcon,
    colorDark: '#64b4ff',
    colorLight: '#0071e3',
    bgDark: 'rgba(100,180,255,0.13)',
    bgLight: 'rgba(0,113,227,0.08)',
    borderDark: 'rgba(100,180,255,0.30)',
    borderLight: 'rgba(0,113,227,0.22)',
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
  const isDark = theme.palette.mode === 'dark'
  const def = VARIANT_DEFS[variant]
  const baseColor = isDark ? def.colorDark : def.colorLight

  const hoverColor: Record<DialogVariant, string> = {
    information: isDark ? '#7cc0ff' : '#1a82eb',
    warning: isDark ? '#ffc77a' : '#f57c00',
    error: isDark ? '#e85555' : '#b71c1c',
    confirmation: isDark ? '#7cc0ff' : '#1a82eb',
  }

  return (
    <Box
      component='button'
      onClick={onClick}
      sx={{
        background: baseColor,
        color: '#fff',
        border: '0.5px solid transparent',
        borderRadius: '7px',
        padding: '5px 16px',
        fontFamily: theme.typography.fontFamily,
        fontSize: '12px',
        fontWeight: 600,
        letterSpacing: '0.01em',
        cursor: 'pointer',
        transition: 'all 0.14s',
        minWidth: '78px',
        '&:hover': {
          background: hoverColor[variant],
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
      onClick={onClick}
      sx={{
        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.75)',
        color: theme.palette.text.primary,
        border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)'}`,
        borderRadius: '7px',
        padding: '5px 16px',
        fontFamily: theme.typography.fontFamily,
        fontSize: '12px',
        fontWeight: 600,
        letterSpacing: '0.01em',
        cursor: 'pointer',
        transition: 'all 0.14s',
        minWidth: '78px',
        boxShadow: !isDark ? 'inset 0 1px 0 rgba(255,255,255,0.5)' : 'none',
        '&:hover': {
          background: isDark
            ? 'rgba(255,255,255,0.10)'
            : 'rgba(255,255,255,0.95)',
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
  const color = isDark ? def.colorDark : def.colorLight
  const { Icon } = def

  return (
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        flexShrink: 0,
        background: isDark ? def.bgDark : def.bgLight,
        border: `0.5px solid ${isDark ? def.borderDark : def.borderLight}`,
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
              sx={{
                fontSize: '14.5px',
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
              sx={{
                fontSize: '12.5px',
                lineHeight: 1.65,
                color: 'text.secondary',
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
          background: isDark ? 'rgba(255,255,255,0.018)' : 'rgba(255,255,255,0.40)',
          borderTop: `0.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
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
