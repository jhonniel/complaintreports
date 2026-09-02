import { useEffect, useRef } from 'react'
import { Popup } from 'maplibre-gl'
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

export function AdminMapCanvas({ layer, reports, clusters, focusTicket }: AdminMapCanvasProps) {
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

    TomTomConfig.instance.put({ apiKey: TOMTOM_API_KEY, language: 'en-GB' })
    const map = new TomTomMap({
      apiKey: TOMTOM_API_KEY,
      style: 'standardLight',
      mapLibre: {
        container: node,
        center: KIDAPAWAN_CENTER,
        zoom: 13,
      },
    })
    mapRef.current = map

    const popup = new Popup({ closeButton: true, maxWidth: '240px' })
    popupRef.current = popup

    void (async () => {
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
          map.mapLibreMap.easeTo({ center: lngLat, zoom: Math.min(map.mapLibreMap.getZoom() + 2, 17) })
          return
        }
        const ticket = String(properties.ticket_number ?? '')
        const point = dataRef.current.reports.find((item) => item.ticket_number === ticket)
        if (!point) return
        popup.setLngLat(lngLat).setHTML(reportPopup(point)).addTo(map.mapLibreMap)
      })

      accessModule.events.access.on('click', (feature, lngLat) => {
        const properties = feature.properties ?? {}
        if (typeof properties.point_count === 'number') {
          map.mapLibreMap.easeTo({ center: lngLat, zoom: Math.min(map.mapLibreMap.getZoom() + 2, 16) })
          return
        }
        const count = Number(properties.count ?? 1)
        popup
          .setLngLat(lngLat)
          .setHTML(
            `<div style="padding:2px;font-size:13px;color:#3f3b32"><p style="margin:0;font-weight:700">${count} approximate visit${count === 1 ? '' : 's'}</p><p style="margin:4px 0 0;font-size:12px;color:#6b6558">Identities are not stored on this layer.</p></div>`,
          )
          .addTo(map.mapLibreMap)
      })

      await syncLayers()
    })()

    async function syncLayers() {
      const current = dataRef.current
      const reportsModule = reportsModuleRef.current
      const accessModule = accessModuleRef.current
      if (!reportsModule || !accessModule) return
      await reportsModule.show(toReportCollection(current.reports), 'reports')
      await accessModule.show(toAccessCollection(current.clusters), 'access')
      reportsModule.setVisible(current.layer === 'reports')
      accessModule.setVisible(current.layer === 'access')
      if (current.layer === 'reports' && current.focusTicket) {
        const focused = current.reports.find((item) => item.ticket_number === current.focusTicket)
        if (focused) {
          map.mapLibreMap.flyTo({ center: [focused.longitude, focused.latitude], zoom: 15 })
          popup.setLngLat([focused.longitude, focused.latitude]).setHTML(reportPopup(focused)).addTo(map.mapLibreMap)
        }
      }
    }

    return () => {
      cancelled = true
      popup.remove()
      map.mapLibreMap.remove()
      mapRef.current = null
      reportsModuleRef.current = null
      accessModuleRef.current = null
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
    if (layer === 'reports' && focusTicket) {
      const focused = reports.find((item) => item.ticket_number === focusTicket)
      if (focused && popupRef.current) {
        map.mapLibreMap.flyTo({ center: [focused.longitude, focused.latitude], zoom: 15 })
        popupRef.current
          .setLngLat([focused.longitude, focused.latitude])
          .setHTML(reportPopup(focused))
          .addTo(map.mapLibreMap)
      }
    }
  }, [layer, reports, clusters, focusTicket])

  return <div ref={containerRef} className="h-[min(75vh,40rem)] min-h-80 w-full" />
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
