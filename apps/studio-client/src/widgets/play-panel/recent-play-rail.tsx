import type { CardSummary, NarrativeTimeline } from '../../entities/index.js'
import { formatDate, formatDateTime, type Translator } from '../../shared/i18n/index.js'
import { timelineCharacterName } from '../../entities/session-identification.js'
import { cardMediaUrl, useCardMediaRevision } from '../../shared/lib/card-media.js'
import { useSlidingHover } from '../../shared/hooks/use-sliding-hover.js'
import styles from './recent-play-rail.module.scss'

type Props = {
  cards: CardSummary[]
  timelines: NarrativeTimeline[]
  t: Translator
  onOpenTimeline(timeline: NarrativeTimeline): void
}

export function RecentPlayRail(props: Props) {
  const mediaRevision = useCardMediaRevision()
  const recent = props.timelines.slice(0, 8)
  const groups = groupByDate(recent)
  const slidingHover = useSlidingHover<HTMLDivElement>()

  return (
    <div
      ref={slidingHover.containerRef}
      className={styles.root}
      data-loom-component="rail-recent-play"
      onPointerOver={slidingHover.onPointerOver}
      onPointerLeave={slidingHover.onPointerLeave}
    >
      <div className={styles.hoverIndicator} style={slidingHover.indicatorStyle} aria-hidden="true" />
      {groups.map(group => <div className={styles.group} key={group.key}>
        <small className={styles.date}>{group.key}</small>
        {group.items.map(timeline => {
        const card = timeline.createdFrom ? props.cards.find(item => item.id === timeline.createdFrom?.cardId) : undefined
        const title = timeline.title || props.t('sessions.untitledTimeline')
        const character = timelineCharacterName(timeline, props.cards, props.t)
        const preview = timeline.latestPreview || timeline.openingPreview
        const avatarUrl = card?.media?.avatarAssetId
          ? cardMediaUrl(card.id, 'avatar', card.media.avatarAssetId, mediaRevision)
          : undefined
        return (
          <button
            data-hover-item
            className={styles.item}
            key={timeline.id}
            type="button"
            onClick={() => props.onOpenTimeline(timeline)}
          >
            <span className={styles.avatar}>{avatarUrl ? <img src={avatarUrl} alt="" /> : card?.name?.slice(0, 1) ?? '·'}</span>
            <span className={styles.info}>
              <strong title={title}>{title}</strong>
              <small title={character}>{character}</small>
              {preview ? <small title={preview}>{preview}</small> : null}
              <small>{formatDateTime(timeline.updatedAt, undefined, { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</small>
            </span>
          </button>
        )
      })}</div>)}
    </div>
  )
}

function groupByDate(items: NarrativeTimeline[]) {
  const groups = new Map<string, NarrativeTimeline[]>()
  for (const item of items) {
    const key = formatDate(item.updatedAt)
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  return [...groups.entries()].map(([key, group]) => ({ key, items: group }))
}
