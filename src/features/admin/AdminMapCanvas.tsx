import '@/lib/maplibreWorker'
import { useEffect, useRef } from 'react'
import { NavigationControl, Popup, LngLatBounds, type Map as MapLibreMap } from 'maplibre-gl'
import { TomTomConfig } from '@tomtom-org/maps-sdk/core'
import { CustomGeoJSONModule, TomTomMap } from '@tomtom-org/maps-sdk/map'
import type { MapAccessCluster, MapReportPoint } from '@shared/map'
import { STATUS_LABELS, PRIORITY_LABELS } from '@shared/report'
import {
  KIDAPAWAN_FIT_BOUNDS,
  KIDAPAWAN_MAX_BOUNDS,
  kidapawanCityCollection,
} from '@/lib/kidapawanBoundary'
import { KIDAPAWAN_CENTER, TOMTOM_API_KEY } from '@/lib/tomtom'
import { createPushPinImage, reportPinId, reportPinImageExpression, reportPinImages } from '@/lib/mapPinImage'
import { formatShortDate } from '@/utils/format'
import 'maplibre-gl/dist/maplibre-gl.css'

export type MapLayer = 'reports' | 'access'

interface AdminMapCanvasProps {
  layer: MapLayer
  reports: MapReportPoint[]
  clusters: MapAccessCluster[]
  focusTicket?: string | null
  compact?: boolean
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function reportPopup(point: MapReportPoint) {
  return `
    <div style="min-width:11rem;padding:2px;font-size:13px;color:#3f3b32">
      <p style="margin:0;font-weight:700">${escapeHtml(point.ticket_number)}</p>
      <p style="margin:4px 0 0">${escapeHtml(point.category_name)}</p>
      ${point.address ? `<p style="margin:4px 0 0;font-size:12px;color:#3f3b32">${escapeHtml(point.address)}</p>` : ''}
      <p style="margin:4px 0 0">${escapeHtml(STATUS_LABELS[point.status])} · ${escapeHtml(PRIORITY_LABELS[point.priority])}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#6b6558">${escapeHtml(formatShortDate(point.created_at))}</p>
      <a style="display:inline-block;margin-top:8px;font-weight:700;color:#194631" href="/admin/reports/${encodeURIComponent(point.ticket_number)}">Open report</a>
    </div>
  `
}

function waitForSize(node: HTMLElement, isCancelled: () => boolean) {
  if (node.clientWidth > 0 && node.clientHeight > 0) return Promise.resolve(true)
  return new Promise<boolean>((resolve) => {
    const observer = new ResizeObserver(() => {
      if (node.clientWidth > 0 && node.clientHeight > 0) {
        observer.disconnect()
        window.clearTimeout(timer)
        resolve(!isCancelled())
      }
    })
    observer.observe(node)
    const timer = window.setTimeout(() => {
      observer.disconnect()
      resolve(!isCancelled() && node.clientWidth > 0 && node.clientHeight > 0)
    }, 2000)
  })
}

export function AdminMapCanvas({ layer, reports, clusters, focusTicket, compact = false }: AdminMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<TomTomMap | null>(null)
  const reportsModuleRef = useRef<CustomGeoJSONModule | null>(null)
  const accessModuleRef = useRef<CustomGeoJSONModule | null>(null)
  const popupRef = useRef<Popup | null>(null)
  const lastFocusRef = useRef('')
  const dataRef = useRef({ reports, clusters, layer, focusTicket })
  dataRef.current = { reports, clusters, layer, focusTicket }

  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    let cancelled = false
    let map: TomTomMap | null = null
    let popup: Popup | null = null
    let resizeObserver: ResizeObserver | undefined

    const frame = window.requestAnimationFrame(() => {
      void start()
    })

    async function start() {
      if (cancelled || !node) return
      const sized = await waitForSize(node, () => cancelled)
      if (!sized || cancelled) return

      try {
      TomTomConfig.instance.put({ apiKey: TOMTOM_API_KEY, language: 'en-GB' })
      map = new TomTomMap({
        style: 'standardLight',
        mapLibre: {
          container: node,
          center: KIDAPAWAN_CENTER,
          zoom: 13,
        },
      })
      mapRef.current = map
      const ml = map.mapLibreMap
      popup = new Popup({ closeButton: true, maxWidth: '240px' })
      popupRef.current = popup
      ml.addControl(new NavigationControl({ showCompass: false }), 'top-right')

      const resize = () => {
        try {
          ml.resize()
        } catch {
          /* map already removed */
        }
      }
      ml.on('load', resize)
      resizeObserver = new ResizeObserver(resize)
      resizeObserver.observe(node)
      resize()

      const [reportsModule, accessModule] = await Promise.all([
        CustomGeoJSONModule.get(map, {
          images: reportPinImages(),
          sources: {
            reports: {
              cluster: { cluster: false },
              layers: [
                {
                  type: 'symbol',
                  layout: {
                    'icon-image': reportPinImageExpression(),
                    'icon-size': 0.55,
                    'icon-anchor': 'bottom',
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true,
                  },
                },
              ],
            },
          },
        }),
        CustomGeoJSONModule.get(map, {
          images: {
            'access-pushpin': createPushPinImage(['#5eead4', '#14b8a6', '#0f766e', '#134e4a']),
          },
          sources: {
            access: {
              cluster: { cluster: true, clusterRadius: 56, clusterMaxZoom: 14 },
              layers: [
                {
                  type: 'symbol',
                  filter: ['has', 'point_count'],
                  layout: {
                    'icon-image': 'access-pushpin',
                    'icon-size': 0.62,
                    'icon-anchor': 'bottom',
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true,
                    'text-field': ['to-string', ['get', 'point_count']],
                    'text-size': 10,
                    'text-offset': [0, -1.15],
                    'text-allow-overlap': true,
                    'text-ignore-placement': true,
                  },
                  paint: {
                    'text-color': '#ffffff',
                    'text-halo-color': '#0f766e',
                    'text-halo-width': 0.8,
                  },
                },
                {
                  type: 'symbol',
                  filter: ['!', ['has', 'point_count']],
                  layout: {
                    'icon-image': 'access-pushpin',
                    'icon-size': 0.55,
                    'icon-anchor': 'bottom',
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true,
                  },
                },
              ],
            },
          },
        }),
      ])

      if (cancelled) return
      reportsModuleRef.current = reportsModule
      accessModuleRef.current = accessModule
      addKidapawanHighlight(ml)

      reportsModule.events.reports.on('click', (feature, lngLat) => {
        const properties = feature.properties ?? {}
        const ticket = String(properties.ticket_number ?? '')
        const point = dataRef.current.reports.find((item) => item.ticket_number === ticket)
        if (!point || !map || !popup) return
        popup.setLngLat(lngLat).setHTML(reportPopup(point)).addTo(map.mapLibreMap)
      })

      accessModule.events.access.on('click', (feature, lngLat) => {
        const properties = feature.properties ?? {}
        if (typeof properties.point_count === 'number') {
          map?.mapLibreMap.easeTo({ center: lngLat, zoom: Math.min(map.mapLibreMap.getZoom() + 2, 16) })
          return
        }
        const count = Number(properties.count ?? 1)
        const ip = String(properties.ip_address ?? '')
        if (!map || !popup) return
        popup
          .setLngLat(lngLat)
          .setHTML(
            `<div style="padding:2px;font-size:13px;color:#3f3b32"><p style="margin:0;font-weight:700">${count} site visit${count === 1 ? '' : 's'}</p>${ip ? `<p style="margin:4px 0 0;font-family:ui-monospace,monospace;font-size:12px">${escapeHtml(ip)}</p>` : ''}<p style="margin:4px 0 0;font-size:12px;color:#6b6558">Public network location of someone who opened the site.</p></div>`,
          )
          .addTo(map.mapLibreMap)
      })

      await syncLayers(map, popup)
      } catch {
        /* Keep the base map visible if pins cannot be added. */
      }
    }

    async function syncLayers(activeMap: TomTomMap, activePopup: Popup) {
      const current = dataRef.current
      const reportsModule = reportsModuleRef.current
      const accessModule = accessModuleRef.current
      if (!reportsModule || !accessModule) return
      await reportsModule.show(
        current.layer === 'reports' ? toReportCollection(current.reports) : emptyCollection(),
        'reports',
      )
      await accessModule.show(
        current.layer === 'access' ? toAccessCollection(current.clusters) : emptyCollection(),
        'access',
      )
      reportsModule.setVisible(current.layer === 'reports')
      accessModule.setVisible(current.layer === 'access')
      applyLayerViewport(activeMap, current.layer, current.reports, current.clusters, current.focusTicket, compact, activePopup)
    }

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
      resizeObserver?.disconnect()
      popup?.remove()
      if (map) {
        try {
          map.mapLibreMap.remove()
        } catch {
          /* already removed */
        }
      }
      mapRef.current = null
      reportsModuleRef.current = null
      accessModuleRef.current = null
      popupRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const reportsModule = reportsModuleRef.current
    const accessModule = accessModuleRef.current
    if (!map || !reportsModule || !accessModule) return
    void (async () => {
      await reportsModule.show(layer === 'reports' ? toReportCollection(reports) : emptyCollection(), 'reports')
      await accessModule.show(layer === 'access' ? toAccessCollection(clusters) : emptyCollection(), 'access')
      reportsModule.setVisible(layer === 'reports')
      accessModule.setVisible(layer === 'access')
      const focusKey = `${layer}:${focusTicket ?? ''}:${reports.map((item) => item.ticket_number).join('|')}:${clusters.map((item) => `${item.latitude},${item.longitude},${item.count}`).join('|')}`
      if (lastFocusRef.current === focusKey) return
      lastFocusRef.current = focusKey
      popupRef.current?.remove()
      if (popupRef.current) {
        applyLayerViewport(map, layer, reports, clusters, focusTicket, compact, popupRef.current)
      }
    })()
  }, [layer, reports, clusters, focusTicket, compact])

  return <div ref={containerRef} className={compact ? 'admin-map-canvas admin-map-canvas--compact' : 'admin-map-canvas'} />
}

function applyLayerViewport(
  map: TomTomMap,
  layer: MapLayer,
  reports: MapReportPoint[],
  clusters: MapAccessCluster[],
  focusTicket: string | null | undefined,
  compact: boolean,
  popup: Popup,
) {
  const lockToCity = layer === 'reports' || compact
  applyCityLock(map.mapLibreMap, lockToCity)
  if (lockToCity) {
    focusReports(map, reports, focusTicket, popup)
    return
  }
  focusAccess(map, clusters)
}

function applyCityLock(map: MapLibreMap, locked: boolean) {
  const visibility = locked ? 'visible' : 'none'
  try {
    if (map.getLayer('kidapawan-fill')) map.setLayoutProperty('kidapawan-fill', 'visibility', visibility)
    if (map.getLayer('kidapawan-outline')) map.setLayoutProperty('kidapawan-outline', 'visibility', visibility)
    if (locked && KIDAPAWAN_MAX_BOUNDS) {
      map.setMinZoom(10)
      map.setMaxZoom(18)
      map.setMaxBounds(KIDAPAWAN_MAX_BOUNDS)
    } else {
      map.setMaxBounds(null)
      map.setMinZoom(3)
      map.setMaxZoom(18)
    }
  } catch {
    /* keep the map visible if the camera cannot be constrained */
  }
}

function focusReports(
  map: TomTomMap,
  reports: MapReportPoint[],
  focusTicket: string | null | undefined,
  popup: Popup,
) {
  const focused = focusTicket ? reports.find((item) => item.ticket_number === focusTicket) : null
  if (focused) {
    map.mapLibreMap.flyTo({ center: [focused.longitude, focused.latitude], zoom: 16 })
    popup.setLngLat([focused.longitude, focused.latitude]).setHTML(reportPopup(focused)).addTo(map.mapLibreMap)
    return
  }
  if (reports.length === 1) {
    map.mapLibreMap.jumpTo({ center: [reports[0].longitude, reports[0].latitude], zoom: 16 })
    return
  }
  if (reports.length > 1) {
    const bounds = new LngLatBounds(
      [reports[0].longitude, reports[0].latitude],
      [reports[0].longitude, reports[0].latitude],
    )
    for (const report of reports) {
      bounds.extend([report.longitude, report.latitude])
    }
    map.mapLibreMap.fitBounds(bounds, { padding: 56, maxZoom: 16, duration: 0 })
    return
  }
  if (KIDAPAWAN_FIT_BOUNDS) {
    map.mapLibreMap.fitBounds(KIDAPAWAN_FIT_BOUNDS, { padding: 36, duration: 0, maxZoom: 13 })
  }
}

function focusAccess(map: TomTomMap, clusters: MapAccessCluster[]) {
  if (clusters.length === 1) {
    map.mapLibreMap.jumpTo({ center: [clusters[0].longitude, clusters[0].latitude], zoom: 8 })
    return
  }
  if (clusters.length > 1) {
    const bounds = new LngLatBounds(
      [clusters[0].longitude, clusters[0].latitude],
      [clusters[0].longitude, clusters[0].latitude],
    )
    for (const cluster of clusters) {
      bounds.extend([cluster.longitude, cluster.latitude])
    }
    map.mapLibreMap.fitBounds(bounds, { padding: 64, maxZoom: 10, duration: 0 })
  }
}

function addKidapawanHighlight(map: MapLibreMap) {
  if (kidapawanCityCollection.features.length === 0) return
  try {
    if (!map.getSource('kidapawan-city')) {
      map.addSource('kidapawan-city', { type: 'geojson', data: kidapawanCityCollection })
    }
    if (!map.getLayer('kidapawan-fill')) {
      map.addLayer({
        id: 'kidapawan-fill',
        type: 'fill',
        source: 'kidapawan-city',
        paint: {
          'fill-color': '#1e583c',
          'fill-opacity': 0.12,
        },
      })
    }
    if (!map.getLayer('kidapawan-outline')) {
      map.addLayer({
        id: 'kidapawan-outline',
        type: 'line',
        source: 'kidapawan-city',
        paint: {
          'line-color': '#194631',
          'line-width': 2.5,
        },
      })
    }
    const pinLayer = map.getStyle().layers?.find((layer) => layer.id.includes('reports') || layer.id.includes('access'))
    if (pinLayer) {
      for (const id of ['kidapawan-fill', 'kidapawan-outline']) {
        if (map.getLayer(id)) map.moveLayer(id, pinLayer.id)
      }
    }
  } catch {
    /* Keep the base map visible if the boundary overlay cannot be added. */
  }
}

function emptyCollection() {
  return { type: 'FeatureCollection' as const, features: [] }
}

function toReportCollection(reports: MapReportPoint[]) {
  return {
    type: 'FeatureCollection' as const,
    features: spreadOverlappingPins(reports).map((report) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [report.longitude, report.latitude] },
      properties: {
        ticket_number: report.ticket_number,
        category_name: report.category_name,
        status: report.status,
        priority: report.priority,
        created_at: report.created_at,
        address: report.address,
        pin_image: reportPinId(report.status),
      },
    })),
  }
}

function spreadOverlappingPins(reports: MapReportPoint[]) {
  const groups = new Map<string, MapReportPoint[]>()
  for (const report of reports) {
    const key = `${report.latitude.toFixed(5)},${report.longitude.toFixed(5)}`
    const group = groups.get(key) ?? []
    group.push(report)
    groups.set(key, group)
  }
  const spread: MapReportPoint[] = []
  for (const group of groups.values()) {
    if (group.length === 1) {
      spread.push(group[0])
      continue
    }
    group.forEach((report, index) => {
      const angle = (index / group.length) * Math.PI * 2
      const radius = 0.00012 + Math.floor(index / 8) * 0.00008
      spread.push({
        ...report,
        latitude: report.latitude + Math.sin(angle) * radius,
        longitude: report.longitude + Math.cos(angle) * radius,
      })
    })
  }
  return spread
}

function toAccessCollection(clusters: MapAccessCluster[]) {
  return {
    type: 'FeatureCollection' as const,
    features: clusters.map((cluster) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [cluster.longitude, cluster.latitude] },
      properties: { count: cluster.count, ip_address: cluster.ip_address ?? '' },
    })),
  }
}
