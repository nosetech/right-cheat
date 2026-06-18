'use client'
import { Fragment } from 'react'

import { Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import { SearchResultItem } from '@/components/molecules/SearchResultItem'
import { CommandSearchResult } from '@/types/api/CheatSheet'

const FONT_CODE = '"JetBrains Mono", "Fira Code", monospace'
const FONT_UI =
  '"Noto Sans JP", -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif'

// 未入力 / 0 件のプレースホルダ
const SearchPlaceholder = ({
  kind,
  query,
}: {
  kind: 'empty' | 'none'
  query?: string
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const accentSolid = isDark ? '#64b4ff' : '#0071e3'
  const empty = kind === 'empty'

  return (
    <Box
      sx={{
        padding: '32px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: isDark
            ? 'rgba(100,180,255,0.10)'
            : 'rgba(0,113,227,0.07)',
          border: `0.5px solid ${
            isDark ? 'rgba(100,180,255,0.22)' : 'rgba(0,113,227,0.16)'
          }`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accentSolid,
        }}
      >
        {empty ? (
          <svg
            width='20'
            height='20'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
          >
            <circle cx='11' cy='11' r='8' />
            <line x1='21' y1='21' x2='16.65' y2='16.65' />
          </svg>
        ) : (
          <svg
            width='20'
            height='20'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
          >
            <circle cx='11' cy='11' r='8' />
            <line x1='21' y1='21' x2='16.65' y2='16.65' />
            <line x1='8' y1='11' x2='14' y2='11' />
          </svg>
        )}
      </Box>
      <Box
        sx={{
          fontFamily: FONT_UI,
          fontSize: '13px',
          fontWeight: 600,
          color: theme.palette.text.primary,
        }}
      >
        {empty ? 'Search across all cheatsheets' : 'No matching commands'}
      </Box>
      <Box
        sx={{
          fontFamily: FONT_UI,
          fontSize: '11.5px',
          color: theme.palette.text.secondary,
          maxWidth: '340px',
          lineHeight: 1.55,
        }}
      >
        {empty ? (
          <Fragment>
            Searches command text, descriptions, and cheatsheet names.
            <br />
            Use{' '}
            <Box component='span' sx={{ fontFamily: FONT_CODE }}>
              ↑↓
            </Box>{' '}
            to navigate,{' '}
            <Box component='span' sx={{ fontFamily: FONT_CODE }}>
              ↵
            </Box>{' '}
            to open the cheatsheet.
          </Fragment>
        ) : (
          <Fragment>
            No results match “
            <Box
              component='span'
              sx={{ color: theme.palette.text.primary, fontFamily: FONT_CODE }}
            >
              {query}
            </Box>
            ”. Try a different keyword.
          </Fragment>
        )}
      </Box>
    </Box>
  )
}

// キーチップ + ラベル（フッターのキーボードヒント）
const Hotkey = ({ chips, label }: { chips: string[]; label: string }) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <Box sx={{ display: 'flex', gap: '2px' }}>
        {chips.map((c, i) => (
          <Box
            key={i}
            component='span'
            sx={{
              fontFamily: FONT_CODE,
              fontSize: '10px',
              fontWeight: 500,
              color: theme.palette.text.primary,
              background: isDark
                ? 'rgba(255,255,255,0.07)'
                : 'rgba(255,255,255,0.78)',
              border: `0.5px solid ${
                isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)'
              }`,
              borderRadius: '4px',
              padding: '1px 5px',
              minWidth: '16px',
              textAlign: 'center',
              boxShadow: isDark
                ? '0 1px 0 rgba(0,0,0,0.35)'
                : '0 1px 0 rgba(0,0,30,0.08), inset 0 0.5px 0 rgba(255,255,255,0.9)',
            }}
          >
            {c}
          </Box>
        ))}
      </Box>
      <Box
        component='span'
        sx={{
          fontFamily: FONT_UI,
          fontSize: '10.5px',
          color: theme.palette.text.secondary,
          letterSpacing: '0.01em',
        }}
      >
        {label}
      </Box>
    </Box>
  )
}

type Props = {
  debouncedQuery: string
  results: CommandSearchResult[]
  focusIdx: number
  onSelect: (hit: CommandSearchResult) => void
  onHover: (idx: number) => void
}

// 結果リスト + プレースホルダ + フッター（キーボードヒント）
export const SearchResults = ({
  debouncedQuery,
  results,
  focusIdx,
  onSelect,
  onHover,
}: Props) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const divider = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'

  return (
    <>
      <Box
        role='listbox'
        sx={{
          flex: 1,
          maxHeight: '420px',
          minHeight: '240px',
          overflowY: 'auto',
          borderTop: `0.5px solid ${divider}`,
          borderBottom: `0.5px solid ${divider}`,
          background: isDark ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.18)',
          scrollbarWidth: 'thin',
        }}
      >
        {!debouncedQuery ? (
          <SearchPlaceholder kind='empty' />
        ) : results.length === 0 ? (
          <SearchPlaceholder kind='none' query={debouncedQuery} />
        ) : (
          results.map((hit, i) => (
            <SearchResultItem
              key={`${hit.id}-${i}`}
              hit={hit}
              query={debouncedQuery}
              focused={i === focusIdx}
              onHover={() => onHover(i)}
              onClick={() => onSelect(hit)}
            />
          ))
        )}
      </Box>

      {/* Footer — キーボードヒント */}
      <Box
        sx={{
          padding: '8px 16px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: isDark
            ? 'rgba(255,255,255,0.018)'
            : 'rgba(255,255,255,0.30)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Hotkey chips={['↑', '↓']} label='Navigate' />
          <Hotkey chips={['↵']} label='Open cheatsheet' />
          <Hotkey chips={['esc']} label='Close' />
        </Box>
      </Box>
    </>
  )
}
