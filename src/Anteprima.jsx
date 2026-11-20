import { useEffect, useState } from 'react'

// Il link Dropbox con dl=1 scarica il file; per mostrarlo nel browser serve raw=1.
export function urlAnteprima(url) {
  try {
    const u = new URL(url)
    u.searchParams.delete('dl')
    u.searchParams.set('raw', '1')
    return u.toString()
  } catch {
    return url
  }
}

// Miniatura nella tabella: al clic chiede di ingrandire l'immagine.
export function Miniatura({ url, onApri }) {
  const [errore, setErrore] = useState(false)
  if (!url) return null
  if (errore) return <span className="info">non disponibile</span>
  const src = urlAnteprima(url)
  return <img className="miniatura" src={src} alt="" loading="lazy" onClick={() => onApri(src)} onError={() => setErrore(true)} />
}

// Immagine ingrandita sopra la pagina: si chiude con un clic o con Esc.
export function Ingrandita({ src, onChiudi }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onChiudi()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onChiudi])
  return (
    <div className="ingrandita" onClick={onChiudi} role="dialog">
      <img src={src} alt="" />
    </div>
  )
}
