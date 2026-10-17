import { t } from '../shared/i18n/index.js'
import { AppStatusPage } from './app-status-page.js'

export function StartupFailurePage() {
  return <AppStatusPage eyebrow="LOOM STUDIO" title={t('startupError.title')}
    description={t('startupError.description')}
    actions={<button type="button" onClick={() => window.location.reload()}>{t('startupError.retry')}</button>} />
}
