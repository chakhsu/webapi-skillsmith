import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'Web API SkillSmith',
  version: '1.0.0',
  description: 'Track web operations and record API requests to generate AI Agent skills.',
  permissions: [
    'debugger',
    'storage',
    'downloads',
    'activeTab',
    'scripting'
  ],
  host_permissions: ['<all_urls>'],
  action: {
    default_popup: 'popup.html',
  },
  options_page: 'options.html',
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
})
