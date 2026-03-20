import React from 'react'

interface FatigueOverlayProps {
  phrase: string
  shiftPeriods?: { inicio: string; fim: string }[]
}

function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

// Very small markdown subset renderer: #, ##, **bold**, *italic*, line breaks
function renderMarkdownToHtml(md: string) {
  const escaped = escapeHtml(md)
  const lines = escaped.split(/\r?\n/)
  const htmlLines = lines.map((line) => {
    // headings
    if (/^#{1}\s+/.test(line)) return `<h1 class="text-6xl font-extrabold leading-tight">${line.replace(/^#{1}\s+/, '')}</h1>`
    if (/^#{2}\s+/.test(line)) return `<h2 class="text-4xl font-bold leading-tight">${line.replace(/^#{2}\s+/, '')}</h2>`
    // bold
    let processed = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // italic
    processed = processed.replace(/\*(.+?)\*/g, '<em>$1</em>')
    // simple links [text](url)
    processed = processed.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="underline">$1</a>')
    return `<p class="text-3xl">${processed}</p>`
  })
  return htmlLines.join('\n')
}

export default function FatigueOverlay({ phrase }: FatigueOverlayProps): React.ReactElement | null {
  const html = renderMarkdownToHtml(phrase || '')
  const [visible, setVisible] = React.useState<boolean>(true)

  // Reaparece quando a frase muda (sem auto-dismiss para modo TV)
  React.useEffect(() => {
    setVisible(true)
  }, [phrase])

  if (!phrase || !visible) return null

  return (
    // Overlay modal em tela cheia (bloqueia interação abaixo). Estilo azul/ branco com fonte muito grande para TV.
    <div
      className="fixed inset-0 z-[9999] bg-[rgba(3,37,65,0.98)] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Mensagem de fadiga"
    >
      <div className="w-full h-full flex items-center justify-center p-8">
        <button
          title="Fechar mensagem de fadiga"
          aria-label="Fechar mensagem de fadiga"
          onClick={() => setVisible(false)}
          className="absolute top-6 right-6 text-white bg-blue-700/90 hover:bg-blue-600 rounded-full p-4 shadow-lg focus:outline-none focus:ring-2 focus:ring-white z-60"
        >
          ✕
        </button>

        <div className="max-w-6xl w-full text-center px-6">
          {/* Main phrase with very large, responsive font for TV */}
          <div className="mb-6">
            <div className="text-[clamp(3.5rem,12vw,12rem)] font-extrabold leading-tight text-white" dangerouslySetInnerHTML={{ __html: html }} />
          </div>


        </div>
      </div>
    </div>
  )
}
