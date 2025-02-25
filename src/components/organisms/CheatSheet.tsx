'use client'
import { CommandField } from '@/components/molecules/CommandField'
import { Typography } from '@mui/material'
import { Stack } from '@mui/system'

export type CheatSheetProps = {}

export const CheatSheet = (props: CheatSheetProps) => {
  return (
    <Stack padding={1} spacing={1}>
      <Typography variant='h2'>Terraform CheatSheet</Typography>
      <Stack padding={1} spacing={1} width='400px'>
        <CommandField description='planの実行' command='terraforom plan' />
        <CommandField description='planの適用' command='terraform apply' />
        <CommandField
          description='planの適用(target指定)'
          command='terraform apply -target"リソース名"'
        />
        <CommandField
          description='refresh(実環境の内容をTFファイルに反映)の実行'
          command='terraform apply -refresh-only'
        />
        <CommandField
          description='フォーマットの実行'
          command='terraform fmt -recursive'
        />
      </Stack>
    </Stack>
  )
}
