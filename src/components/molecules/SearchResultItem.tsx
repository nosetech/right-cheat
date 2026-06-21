'use client'
import { Fragment, useState } from 'react'

import { Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import { CommandSearchResult } from '@/types/api/CheatSheet'
import {
  buildHighlights,
  HighlightSpan,
  snippetSpans,
} from '@/utils/searchHighlight'

const FONT_CODE = '"JetBrains Mono", "Fira Code", monospace'
const FONT_UI =
  '"Noto Sans JP", -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif'

// マッチ部分を <mark> で強調するインラインテキスト
const HiText = ({
  spans,
  isDark,
}: {
  spans: HighlightSpan[]
  isDark: boolean
}) => (
  <>
    {spans.map((s, i) =>
      s.match ? (
        <Box
          key={i}
          component='mark'
          sx={{
            background: isDark
              ? 'rgba(255,210,80,0.28)'
              : 'rgba(255,200,40,0.42)',
            color: 'inherit',
            borderRadius: '2px',
            padding: '0 1px',
            boxShadow: isDark
              ? 'inset 0 0 0 0.5px rgba(255,210,80,0.45)'
              : 'inset 0 0 0 0.5px rgba(180,130,0,0.30)',
            fontWeight: 'inherit',
          }}
        >
          {s.text}
        </Box>
      ) : (
        <Fragment key={i}>{s.text}</Fragment>
      ),
    )}
  </>
)

// 所属チートシート名のピル（色付きドット + 名前）
const SheetBadge = ({
  name,
  isDark,
  focused,
  accentSolid,
}: {
  name: string
  isDark: boolean
  focused: boolean
  accentSolid: string
}) => {
  const theme = useTheme()
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontFamily: FONT_UI,
        fontSize: 'calc(10.5px * var(--font-scale))',
        fontWeight: 500,
        letterSpacing: '0.01em',
        color: focused ? accentSolid : theme.palette.text.secondary,
        background: focused
          ? isDark
            ? 'rgba(100,180,255,0.14)'
            : 'rgba(0,113,227,0.08)'
          : isDark
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(255,255,255,0.60)',
        border: `0.5px solid ${
          focused
            ? isDark
              ? 'rgba(100,180,255,0.35)'
              : 'rgba(0,113,227,0.28)'
            : isDark
              ? 'rgba(255,255,255,0.10)'
              : 'rgba(0,0,0,0.08)'
        }`,
        borderRadius: '999px',
        padding: '1.5px 8px 1.5px 6px',
        flexShrink: 0,
        whiteSpace: 'nowrap',
        transition: 'all 0.14s',
        boxShadow: !isDark ? 'inset 0 0.5px 0 rgba(255,255,255,0.7)' : 'none',
      }}
    >
      <Box
        sx={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: focused ? accentSolid : theme.palette.text.disabled,
          flexShrink: 0,
          transition: 'background 0.14s',
        }}
      />
      {name}
    </Box>
  )
}

type Props = {
  hit: CommandSearchResult
  query: string
  focused: boolean
  onClick: () => void
  onHover: () => void
}

// 検索結果 1 行（説明 + SheetBadge + コマンドスニペット + ハイライト + ↵）
export const SearchResultItem = ({
  hit,
  query,
  focused,
  onClick,
  onHover,
}: Props) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const accentSolid = isDark ? '#64b4ff' : '#0071e3'
  const [hov, setHov] = useState(false)

  const descSpans = buildHighlights(hit.description || '', query)
  const cmdSpans = snippetSpans(hit.command_text, query)
  const active = focused || hov

  return (
    <Box
      onMouseEnter={() => {
        setHov(true)
        onHover()
      }}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      role='option'
      aria-selected={focused}
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '9px 12px 9px 14px',
        cursor: 'pointer',
        background: focused
          ? isDark
            ? 'rgba(100,180,255,0.10)'
            : 'rgba(0,113,227,0.06)'
          : hov
            ? isDark
              ? 'rgba(255,255,255,0.04)'
              : 'rgba(255,255,255,0.55)'
            : 'transparent',
        borderLeft: `2.5px solid ${focused ? accentSolid : 'transparent'}`,
        transition: 'background 0.1s, border-color 0.1s',
      }}
    >
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {/* Row 1 — 説明 + SheetBadge */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            minWidth: 0,
          }}
        >
          <Box
            component='span'
            sx={{
              fontFamily: FONT_UI,
              fontSize: 'calc(13px * var(--font-scale))',
              fontWeight: 600,
              color: theme.palette.text.primary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              minWidth: 0,
            }}
          >
            {hit.description ? (
              <HiText spans={descSpans} isDark={isDark} />
            ) : (
              <Box
                component='span'
                sx={{
                  color: theme.palette.text.disabled,
                  fontWeight: 400,
                  fontStyle: 'italic',
                }}
              >
                (no description)
              </Box>
            )}
          </Box>
          <SheetBadge
            name={hit.cheatsheet_title}
            isDark={isDark}
            focused={focused}
            accentSolid={accentSolid}
          />
        </Box>

        {/* Row 2 — コマンドスニペット */}
        <Box
          sx={{
            fontFamily: FONT_CODE,
            fontSize: 'calc(11.5px * var(--font-scale))',
            color: focused
              ? theme.palette.text.primary
              : theme.palette.text.secondary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
            lineHeight: 1.45,
            transition: 'color 0.14s',
          }}
        >
          <HiText spans={cmdSpans} isDark={isDark} />
        </Box>
      </Box>

      {/* フォーカス行の ↵ グリフ */}
      <Box
        sx={{
          flexShrink: 0,
          opacity: focused ? 0.85 : active ? 0.35 : 0,
          transition: 'opacity 0.14s',
          paddingTop: '6px',
          color: focused ? accentSolid : theme.palette.text.disabled,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <svg
          width='13'
          height='13'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2.2'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <polyline points='9 10 4 15 9 20' />
          <path d='M20 4v7a4 4 0 0 1-4 4H4' />
        </svg>
      </Box>
    </Box>
  )
}
