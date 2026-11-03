// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  modules: ['@tresjs/nuxt'],
  devtools: { enabled: true },
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/avif', href: '/ui/favicon.avif' },
      ],
      script: [
        {
          key: 'stash-gate',
          tagPriority: 'critical',
          innerHTML: `(function () {
  var host = location.hostname
  if (host === 'localhost' || host === '127.0.0.1') return
  var ua = navigator.userAgent || ''
  var mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua))
  if (mobile || window.innerWidth < 1000) location.replace('https://zhe-testname.github.io/my_portfolio/')
})()`,
        },
      ],
    },
  },
})
