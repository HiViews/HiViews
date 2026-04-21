// HiViews logo auto-injector
// Finds every element with a data-hv-logo attribute and replaces it with
// the correct SVG fetched from the path in the meta registry.
// Runs once on DOMContentLoaded. Safe to ship as defer.

(function () {
  'use strict'

  function getRegistry() {
    return {
      wordmark: document.querySelector('meta[name="hv-logo-wordmark"]')?.content,
      icon:     document.querySelector('meta[name="hv-logo-icon"]')?.content,
    }
  }

  async function fetchSvg(path) {
    if (!path) return null
    try {
      const res = await fetch(path, { cache: 'force-cache' })
      if (!res.ok) return null
      return await res.text()
    } catch {
      return null
    }
  }

  function applySize(svgEl, host) {
    const w = host.dataset.hvWidth
    const h = host.dataset.hvHeight
    if (w) svgEl.setAttribute('width', w)
    if (h) svgEl.setAttribute('height', h)
    if (!w && !h) {
      svgEl.removeAttribute('width')
      svgEl.removeAttribute('height')
      svgEl.style.width = '100%'
      svgEl.style.height = 'auto'
    }
  }

  async function init() {
    const registry = getRegistry()
    const hosts = document.querySelectorAll('[data-hv-logo]')

    await Promise.all(
      Array.from(hosts).map(async (host) => {
        const variant = host.dataset.hvLogo
        const path = registry[variant]
        if (!path) {
          console.warn(`[hv-logo] Unknown variant: ${variant}`)
          return
        }

        const svgText = await fetchSvg(path)
        if (!svgText) return

        const parser = new DOMParser()
        const doc = parser.parseFromString(svgText, 'image/svg+xml')
        const svgEl = doc.querySelector('svg')
        if (!svgEl) return

        applySize(svgEl, host)
        host.replaceChildren(svgEl)
      })
    )
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
