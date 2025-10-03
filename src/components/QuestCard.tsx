import clsx from 'clsx'
import { format, isBefore } from 'date-fns'
import { DifficultyBadge } from './DifficultyBadge'
import type { FeedCard } from '../data/repository'
import type { User } from '../types'
import { difficultyMultiplier } from '../lib/scoring'

interface QuestCardProps {
  card: FeedCard
  currentUser?: User | null
  onClaim: () => void
  onComplete: () => void
  disabledReason?: string
}

const recurrenceLabels: Record<string, string> = {
  daily: 'Daily Quest',
  weekly: 'Weekly Quest',
  monthly: 'Monthly Quest',
  once: 'One-time Quest',
}

const completionLines = ['Quest turned in!', 'Loot secured!', 'The guild sings your praises!', 'XP gained!']

export function QuestCard({ card, currentUser, onClaim, onComplete, disabledReason }: QuestCardProps) {
  const isMine = card.assignedTo === currentUser?.id
  const isClaimed = card.status === 'claimed'
  const isCompleted = card.status === 'completed'
  const isExpired = isBefore(new Date(card.expiresAt), new Date())
  const assignedName = card.assignedUser ? card.assignedUser.name : null
  const points = card.template.points * difficultyMultiplier(card.template.difficulty)

  return (
    <article
      className={clsx(
        'relative overflow-hidden rounded-3xl border border-slate-700 bg-slate-900/80 p-5 shadow-lg transition hover:border-primary/60',
        { 'opacity-60': isExpired },
      )}
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-900 via-slate-900/40 to-slate-900" aria-hidden />
      <div className="flex items-center justify-between gap-3">
        <DifficultyBadge difficulty={card.template.difficulty} />
        <span className="text-xs font-semibold uppercase tracking-widest text-primary/70">
          {recurrenceLabels[card.template.recurrence]}
        </span>
      </div>
      <h3 className="mt-4 text-xl font-bold text-white">{card.template.title}</h3>
      <p className="mt-2 text-sm text-slate-300">{card.template.flavorText}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <span className="rounded-full bg-slate-800/60 px-3 py-1 font-semibold text-slate-200">{points} pts</span>
        <span className="rounded-full bg-slate-800/40 px-3 py-1">Due {format(new Date(card.expiresAt), 'MMM d, h:mma')}</span>
        {assignedName && !isCompleted && (
          <span className="rounded-full bg-slate-800/40 px-3 py-1">Claimed by {assignedName}</span>
        )}
        {card.template.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-slate-800/50 px-3 py-1 uppercase tracking-wide text-slate-400">
            #{tag}
          </span>
        ))}
      </div>
      {card.template.notes && <p className="mt-3 text-xs text-slate-400">{card.template.notes}</p>}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {isCompleted ? (
          <span className="rounded-xl bg-emerald-600/30 px-4 py-2 text-sm font-semibold text-emerald-300 shadow-inner">
            {completionLines[Math.floor(Math.random() * completionLines.length)]}
          </span>
        ) : (
          <>
            <button
              type="button"
              className={clsx(
                'flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400',
                { 'max-w-[160px]': !isMine },
              )}
              onClick={isClaimed ? onComplete : onClaim}
              disabled={isExpired || (!!disabledReason && !isMine && !isClaimed) || (isClaimed && !isMine)}
            >
              {isClaimed ? (isMine ? 'Complete' : 'Claimed') : 'Claim'}
            </button>
            {disabledReason && !isMine && !isExpired && (
              <span className="text-xs font-semibold text-amber-400">{disabledReason}</span>
            )}
          </>
        )}
      </div>
    </article>
  )
}
