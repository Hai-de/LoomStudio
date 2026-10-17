import styles from './resource-unavailable.module.scss'

export function ResourceUnavailable({ message }: { message: string }) {
  return <div className={styles.container} role="status"><p>{message}</p></div>
}
