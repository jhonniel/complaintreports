import '@/lib/maplibreWorker'
import { useEffect, useRef } from 'react'
import { NavigationControl, Popup, LngLatBounds } from 'maplibre-gl'
import { TomTomConfig } from '@tomtom-org/maps-sdk/core'
import { CustomGeoJSONModule, TomTomMap } from '@tomtom-org/maps-sdk/map'
import type { MapAccessCluster, MapReportPoint } from '@shared/map'
import { STATUS_LABELS, PRIORITY_LABELS } from '@shared/report'
import { KIDAPAWAN_CENTER, TOMTOM_API_KEY } from '@/lib/tomtom'
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
          sources: {
            reports: {
              cluster: { cluster: true, clusterRadius: 52, clusterMaxZoom: 16 },
              layers: [
                {
                  type: 'circle',
                  filter: ['has', 'point_count'],
                  paint: {
                    'circle-color': '#1e583c',
                    'circle-radius': ['step', ['get', 'point_count'], 16, 8, 20, 20, 26],
                  },
                },
                {
                  type: 'symbol',
                  filter: ['has', 'point_count'],
                  layout: {
                    'text-field': ['to-string', ['get', 'point_count']],
                    'text-size': 12,
                  },
                  paint: { 'text-color': '#ffffff' },
                },
                {
                  type: 'circle',
                  filter: ['!', ['has', 'point_count']],
                  paint: {
                    'circle-color': '#c49a3c',
                    'circle-radius': 8,
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff',
                  },
                },
              ],
            },
          },
        }),
        CustomGeoJSONModule.get(map, {
          sources: {
            access: {
              cluster: { cluster: true, clusterRadius: 56, clusterMaxZoom: 14 },
              layers: [
                {
                  type: 'circle',
                  filter: ['has', 'point_count'],
                  paint: {
                    'circle-color': '#1f9d8a',
                    'circle-radius': ['step', ['get', 'point_count'], 16, 8, 22],
                    'circle-opacity': 0.85,
                  },
                },
                {
                  type: 'symbol',
                  filter: ['has', 'point_count'],
                  layout: {
                    'text-field': ['to-string', ['get', 'point_count']],
                    'text-size': 12,
                  },
                  paint: { 'text-color': '#ffffff' },
                },
                {
                  type: 'circle',
                  filter: ['!', ['has', 'point_count']],
                  paint: {
                    'circle-color': '#1f9d8a',
                    'circle-radius': 10,
                    'circle-opacity': 0.7,
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff',
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

      reportsModule.events.reports.on('click', (feature, lngLat) => {
        const properties = feature.properties ?? {}
        if (typeof properties.point_count === 'number') {
          map?.mapLibreMap.easeTo({ center: lngLat, zoom: Math.min(map.mapLibreMap.getZoom() + 2, 17) })
          return
        }
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
        if (!map || !popup) return
        popup
          .setLngLat(lngLat)
          .setHTML(
            `<div style="padding:2px;font-size:13px;color:#3f3b32"><p style="margin:0;font-weight:700">${count} approximate visit${count === 1 ? '' : 's'}</p><p style="margin:4px 0 0;font-size:12px;color:#6b6558">Identities are not stored on this layer.</p></div>`,
          )
          .addTo(map.mapLibreMap)
      })

      await syncLayers(map, popup)
    }

    async function syncLayers(activeMap: TomTomMap, activePopup: Popup) {
      const current = dataRef.current
      const reportsModule = reportsModuleRef.current
      const accessModule = accessModuleRef.current
      if (!reportsModule || !accessModule) return
      await reportsModule.show(toReportCollection(current.reports), 'reports')
      await accessModule.show(toAccessCollection(current.clusters), 'access')
      reportsModule.setVisible(current.layer === 'reports')
      accessModule.setVisible(current.layer === 'access')
      if (current.layer === 'reports') {
        focusReports(activeMap, current.reports, current.focusTicket, activePopup)
      }
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
    void reportsModule.show(toReportCollection(reports), 'reports')
    void accessModule.show(toAccessCollection(clusters), 'access')
    reportsModule.setVisible(layer === 'reports')
    accessModule.setVisible(layer === 'access')
    popupRef.current?.remove()
    if (layer === 'reports' && popupRef.current) {
      focusReports(map, reports, focusTicket, popupRef.current)
    }
  }, [layer, reports, clusters, focusTicket])

  return <div ref={containerRef} className={compact ? 'admin-map-canvas admin-map-canvas--compact' : 'admin-map-canvas'} />
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
  }
}

function toReportCollection(reports: MapReportPoint[]) {
  return {
    type: 'FeatureCollection' as const,
    features: reports.map((report) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [report.longitude, report.latitude] },
      properties: {
        ticket_number: report.ticket_number,
        category_name: report.category_name,
        status: report.status,
        priority: report.priority,
        created_at: report.created_at,
      },
    })),
  }
}

function toAccessCollection(clusters: MapAccessCluster[]) {
  return {
    type: 'FeatureCollection' as const,
    features: clusters.map((cluster) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [cluster.longitude, cluster.latitude] },
      properties: { count: cluster.count },
    })),
  }
}
