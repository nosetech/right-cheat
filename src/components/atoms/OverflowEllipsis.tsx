'use client'

import { ReactNode } from 'react'

export type OverflowEllipsisProps = {
  children: ReactNode
}

export const OverflowEllipsis = ({ children }: OverflowEllipsisProps) => {
  return (
    <div style={{ display: 'table', width: '100%' }}>
      <div
        style={{
          display: 'table-cell',
          maxWidth: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {children}
      </div>
    </div>
  )
}
