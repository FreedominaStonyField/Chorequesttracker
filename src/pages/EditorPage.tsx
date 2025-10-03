import { useAtom } from 'jotai'
import { useMemo, useState } from 'react'
import { nanoid } from 'nanoid'
import { currentUserAtom } from '../lib/state'
import {
  useDeleteTemplateMutation,
  useDuplicateTemplateMutation,
  useTemplates,
  useUpsertTemplateMutation,
} from '../hooks/useRepository'
import { Modal } from '../components/Modal'
import { CardEditorForm } from '../features/editor/CardEditorForm'
import type { CardTemplate } from '../types'

export function EditorPage() {
  const { data: templates } = useTemplates()
  const upsertTemplate = useUpsertTemplateMutation()
  const duplicateTemplate = useDuplicateTemplateMutation()
  const deleteTemplate = useDeleteTemplateMutation()
  const [currentUser] = useAtom(currentUserAtom)
  const [selectedTemplate, setSelectedTemplate] = useState<CardTemplate | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState<'activate' | 'deactivate' | 'delete' | 'none'>('none')
  const [message, setMessage] = useState('')

  const sortedTemplates = useMemo(() => {
    return (templates ?? []).slice().sort((a, b) => a.title.localeCompare(b.title))
  }, [templates])

  function toggleSelection(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  async function handleBulkApply() {
    if (!currentUser) {
      setMessage('Select a hero with permissions to perform bulk actions.')
      return
    }
    for (const id of selectedIds) {
      const template = templates?.find((item) => item.id === id)
      if (!template) continue
      if (bulkAction === 'activate') {
        await upsertTemplate.mutateAsync({ template: { ...template, active: true }, actorId: currentUser.id })
      } else if (bulkAction === 'deactivate') {
        await upsertTemplate.mutateAsync({ template: { ...template, active: false }, actorId: currentUser.id })
      } else if (bulkAction === 'delete') {
        await deleteTemplate.mutateAsync({ templateId: id, actorId: currentUser.id })
      }
    }
    setSelectedIds([])
    setMessage('Bulk action applied.')
  }

  async function handleEditorSubmit(template: CardTemplate) {
    if (!currentUser) {
      setMessage('Only an authenticated hero may edit quests.')
      return
    }
    await upsertTemplate.mutateAsync({ template, actorId: currentUser.id })
    setSelectedTemplate(null)
    setMessage('Quest template saved!')
  }

  async function handleDuplicate(templateId: string) {
    if (!currentUser) {
      setMessage('Only an authenticated hero may duplicate quests.')
      return
    }
    await duplicateTemplate.mutateAsync({ templateId, actorId: currentUser.id })
    setMessage('Quest duplicated.')
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="rounded-3xl border border-slate-700 bg-slate-900/70 p-5 text-sm text-slate-300">
        <h2 className="text-xl font-semibold text-white">Quest Template Forge</h2>
        <p className="mt-2 text-slate-400">
          Craft, duplicate, or retire quest templates. Select multiple to apply bulk actions.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              setSelectedTemplate({
                id: nanoid(),
                title: '',
                flavorText: '',
                difficulty: 'normal',
                points: 10,
                recurrence: 'daily',
                active: true,
                tags: [],
                notes: '',
                createdBy: currentUser?.id ?? 'system',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                weekAnchor: 1,
                monthAnchor: 1,
                requireProof: false,
              })
            }
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-indigo-500"
          >
            New quest template
          </button>
          <select
            value={bulkAction}
            onChange={(event) => setBulkAction(event.target.value as typeof bulkAction)}
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white"
          >
            <option value="none">Bulk action</option>
            <option value="activate">Activate</option>
            <option value="deactivate">Deactivate</option>
            <option value="delete">Archive</option>
          </select>
          <button
            type="button"
            onClick={handleBulkApply}
            className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-primary"
            disabled={bulkAction === 'none' || selectedIds.length === 0}
          >
            Apply to {selectedIds.length} selected
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-700 bg-slate-900/70">
        <table className="min-w-full divide-y divide-slate-700 text-sm text-slate-200">
          <thead>
            <tr className="bg-slate-900/80 text-xs uppercase tracking-widest text-slate-400">
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.length > 0 && selectedIds.length === sortedTemplates.length}
                  onChange={(event) =>
                    setSelectedIds(event.target.checked ? sortedTemplates.map((template) => template.id) : [])
                  }
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800"
                />
              </th>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Recurrence</th>
              <th className="px-4 py-3 text-left">Difficulty</th>
              <th className="px-4 py-3 text-left">Points</th>
              <th className="px-4 py-3 text-left">Tags</th>
              <th className="px-4 py-3 text-left">Active</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {sortedTemplates.map((template) => (
              <tr key={template.id} className="hover:bg-slate-800/50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(template.id)}
                    onChange={() => toggleSelection(template.id)}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-800"
                  />
                </td>
                <td className="px-4 py-3 font-semibold text-white">{template.title}</td>
                <td className="px-4 py-3 text-xs uppercase tracking-widest text-slate-400">{template.recurrence}</td>
                <td className="px-4 py-3 text-xs uppercase tracking-widest text-slate-400">{template.difficulty}</td>
                <td className="px-4 py-3">{template.points}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{template.tags.join(', ')}</td>
                <td className="px-4 py-3">{template.active ? 'Yes' : 'No'}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTemplate(template)}
                      className="rounded-xl border border-slate-600 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-primary"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(template.id)}
                      className="rounded-xl border border-slate-600 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-primary"
                    >
                      Duplicate
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {message && <p className="rounded-2xl bg-emerald-600/20 px-4 py-3 text-sm text-emerald-200">{message}</p>}

      <Modal open={!!selectedTemplate} onClose={() => setSelectedTemplate(null)} title="Quest template" wide>
        {selectedTemplate && currentUser ? (
          <CardEditorForm
            currentUserId={currentUser.id}
            template={selectedTemplate}
            onSubmit={handleEditorSubmit}
            onCancel={() => setSelectedTemplate(null)}
          />
        ) : (
          <p className="text-slate-300">Choose a hero before editing templates.</p>
        )}
      </Modal>
    </section>
  )
}
