import { useAtom } from 'jotai'
import { useMemo, useState } from 'react'
import { QuestFilters } from '../components/QuestFilters'
import { QuestCard } from '../components/QuestCard'
import { questFilterAtom, currentUserAtom } from '../lib/state'
import {
  useClaimMutation,
  useCompleteMutation,
  useDeleteTemplateMutation,
  useFeed,
  useUpsertTemplateMutation,
} from '../hooks/useRepository'
import { Modal } from '../components/Modal'
import { CardEditorForm } from '../features/editor/CardEditorForm'
import type { CardTemplate, CardStatus, Difficulty } from '../types'
import type { FeedCard } from 'shared/types'

export function FeedPage() {
  const [filter, setFilter] = useAtom(questFilterAtom)
  const [currentUser] = useAtom(currentUserAtom)
  const { data: feed, isLoading } = useFeed()
  const claimMutation = useClaimMutation()
  const completeMutation = useCompleteMutation()
  const upsertTemplate = useUpsertTemplateMutation()
  const deleteTemplate = useDeleteTemplateMutation()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorTemplate, setEditorTemplate] = useState<CardTemplate | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const filtered = useMemo<FeedCard[]>(() => {
    const source = feed ?? []
    return source.filter((card) => {
      if (filter.mine && card.assignedTo !== currentUser?.id) return false
      if (filter.unclaimed && card.status !== 'available') return false
      if (filter.completed && card.status !== 'completed') return false
      if (filter.recurrence !== 'all' && card.template.recurrence !== filter.recurrence) return false
      if (filter.search) {
        const haystack = `${card.template.title} ${card.template.notes ?? ''} ${card.template.tags.join(' ')}`.toLowerCase()
        if (!haystack.includes(filter.search.toLowerCase())) return false
      }
      if (filter.tags.length > 0 && !filter.tags.every((tag) => card.template.tags.includes(tag))) {
        return false
      }
      return true
    })
  }, [feed, filter, currentUser?.id])

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const difficultyOrder: Record<Difficulty, number> = { boss: 4, hard: 3, normal: 2, easy: 1 }
        const statusOrder: Record<CardStatus, number> = { available: 0, claimed: 1, completed: 2, expired: 3 }
        const statusComparison = statusOrder[a.status] - statusOrder[b.status]
        if (statusComparison !== 0) return statusComparison
        const difficultyComparison =
          difficultyOrder[b.template.difficulty] - difficultyOrder[a.template.difficulty]
        if (difficultyComparison !== 0) return difficultyComparison
        return a.template.title.localeCompare(b.template.title)
      }),
    [filtered],
  )

  async function handleClaim(cardId: string) {
    if (!currentUser) {
      setFeedback('Choose a hero to claim quests.')
      return
    }
    try {
      await claimMutation.mutateAsync({ cardId, userId: currentUser.id })
      setFeedback('Quest claimed!')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to claim quest')
    }
  }

  async function handleComplete(cardId: string) {
    if (!currentUser) {
      setFeedback('Choose a hero to complete quests.')
      return
    }
    try {
      await completeMutation.mutateAsync({ cardId, userId: currentUser.id })
      setFeedback('Quest turned in!')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to complete quest')
    }
  }

  async function handleSaveTemplate(template: CardTemplate) {
    if (!currentUser) {
      setFeedback('Choose a hero to craft new quests.')
      return
    }
    const isEditing = Boolean(editorTemplate)
    const payload = { ...template, createdBy: template.createdBy ?? currentUser.id }
    try {
      await upsertTemplate.mutateAsync({ template: payload, actorId: currentUser.id })
      setFeedback(isEditing ? 'Quest updated!' : 'Quest crafted and ready!')
      setEditorOpen(false)
      setEditorTemplate(null)
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to save quest')
    }
  }

  async function handleDeleteTemplate(template: CardTemplate) {
    if (!currentUser) {
      setFeedback('Choose a hero to retire quests.')
      return
    }
    const confirmed = window.confirm(`Remove the "${template.title}" quest template?`)
    if (!confirmed) return
    try {
      await deleteTemplate.mutateAsync({ templateId: template.id, actorId: currentUser.id })
      setFeedback('Quest retired.')
      setEditorOpen(false)
      setEditorTemplate(null)
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to retire quest')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <QuestFilters filter={filter} onChange={setFilter} />
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300">
        <p className="font-semibold text-white">Quest Actions</p>
        <p className="text-slate-400">
          Claim quests to lock them in for 60 seconds. Complete them to earn points, streaks, and badges. Proof may be required
          for legendary chores.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setEditorTemplate(null)
              setEditorOpen(true)
            }}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-indigo-500"
          >
            + Quick craft quest
          </button>
        </div>
        {feedback && <p className="text-emerald-300">{feedback}</p>}
      </div>
      {isLoading ? (
        <p className="text-center text-slate-400">Loading quests...</p>
      ) : sorted.length === 0 ? (
        <p className="text-center text-slate-400">No quests match these filters yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sorted.map((card) => (
            <QuestCard
              key={card.id}
              card={card}
              currentUser={currentUser ?? undefined}
              onClaim={() => handleClaim(card.id)}
              onComplete={() => handleComplete(card.id)}
              onEditTemplate={
                currentUser?.isAdult ? () => {
                  setEditorTemplate(card.template)
                  setEditorOpen(true)
                } : undefined
              }
              onArchiveTemplate={
                currentUser?.isAdult
                  ? () => {
                      void handleDeleteTemplate(card.template)
                    }
                  : undefined
              }
              disabledReason={card.assignedTo && card.assignedTo !== currentUser?.id ? 'Claimed by another hero' : undefined}
            />
          ))}
        </div>
      )}

      <Modal
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false)
          setEditorTemplate(null)
        }}
        title={editorTemplate ? `Edit ${editorTemplate.title}` : 'Craft a new quest'}
        wide
      >
        {currentUser ? (
          <CardEditorForm
            currentUserId={currentUser.id}
            template={editorTemplate ?? undefined}
            onSubmit={(template) => handleSaveTemplate(template)}
            onDelete={editorTemplate ? (template) => handleDeleteTemplate(template) : undefined}
            onCancel={() => {
              setEditorOpen(false)
              setEditorTemplate(null)
            }}
          />
        ) : (
          <p className="text-slate-300">Choose a hero before crafting quests.</p>
        )}
      </Modal>
    </div>
  )
}
