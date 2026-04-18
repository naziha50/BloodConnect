// Leaflet icon fix for Vite bundler
if (typeof window !== 'undefined') {
  // Only run on client side to avoid SSR issues
  import('leaflet').then((L) => {
    // Import marker images
    const markerIcon2x = '/leaflet/images/marker-icon-2x.png'
    const markerIcon = '/leaflet/images/marker-icon.png'
    const markerShadow = '/leaflet/images/marker-shadow.png'

    // Fix missing marker icons with bundlers
    delete (L.default.Icon.Default.prototype as any)._getIconUrl
    L.default.Icon.Default.mergeOptions({
      iconRetinaUrl: markerIcon2x,
      iconUrl: markerIcon,
      shadowUrl: markerShadow,
    })
  })
}