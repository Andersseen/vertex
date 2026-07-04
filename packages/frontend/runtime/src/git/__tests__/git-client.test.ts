import { describe, test, expect } from 'bun:test'
import { categorizeStatusMatrix, type StatusMatrixRow } from '../git-client'

describe('categorizeStatusMatrix', () => {
  test('returns empty buckets for an empty matrix', () => {
    expect(categorizeStatusMatrix([])).toEqual({
      modified: [],
      added: [],
      deleted: [],
      untracked: [],
    })
  })

  test('classifies modified files (in HEAD, changed in workdir)', () => {
    const matrix: StatusMatrixRow[] = [['src/a.ts', 1, 2, 1]]
    expect(categorizeStatusMatrix(matrix).modified).toEqual(['src/a.ts'])
  })

  test('classifies staged new files as added (absent in HEAD, staged)', () => {
    const matrix: StatusMatrixRow[] = [['new.ts', 0, 2, 2]]
    const result = categorizeStatusMatrix(matrix)
    expect(result.added).toEqual(['new.ts'])
    expect(result.untracked).toEqual([])
  })

  test('classifies deleted files (in HEAD, absent in workdir)', () => {
    const matrix: StatusMatrixRow[] = [['gone.ts', 1, 0, 1]]
    expect(categorizeStatusMatrix(matrix).deleted).toEqual(['gone.ts'])
  })

  test('classifies untracked files (absent in HEAD, present, not staged)', () => {
    const matrix: StatusMatrixRow[] = [['scratch.txt', 0, 2, 0]]
    expect(categorizeStatusMatrix(matrix).untracked).toEqual(['scratch.txt'])
  })

  test('leaves unchanged files (1,1,1) out of every bucket', () => {
    const matrix: StatusMatrixRow[] = [['unchanged.ts', 1, 1, 1]]
    expect(categorizeStatusMatrix(matrix)).toEqual({
      modified: [],
      added: [],
      deleted: [],
      untracked: [],
    })
  })

  test('handles a mixed matrix, bucketing each row once', () => {
    const matrix: StatusMatrixRow[] = [
      ['keep.ts', 1, 1, 1],
      ['edit.ts', 1, 2, 1],
      ['staged.ts', 0, 2, 2],
      ['removed.ts', 1, 0, 1],
      ['temp.log', 0, 2, 0],
    ]
    expect(categorizeStatusMatrix(matrix)).toEqual({
      modified: ['edit.ts'],
      added: ['staged.ts'],
      deleted: ['removed.ts'],
      untracked: ['temp.log'],
    })
  })
})
